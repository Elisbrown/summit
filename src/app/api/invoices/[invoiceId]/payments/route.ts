import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, payments, income } from '@/lib/db/schema';
import { and, eq, sum, sql } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { z } from 'zod';

const recordPaymentSchema = z.object({
    amount: z.coerce.number().positive('Amount must be positive'),
    paymentDate: z.coerce.date(),
    paymentMethod: z.enum(['card', 'bank_transfer', 'cash', 'other']),
    notes: z.string().optional().nullable(),
});

// GET /api/invoices/[invoiceId]/payments - List payments for an invoice
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    return withAuth<any>(request, async (authInfo) => {
        try {
            const { invoiceId } = await params;
            const id = parseInt(invoiceId);
            const { companyId } = authInfo;

            // Verify the invoice belongs to the company
            const [invoice] = await db
                .select()
                .from(invoices)
                .where(
                    and(
                        eq(invoices.id, id),
                        eq(invoices.companyId, companyId),
                        eq(invoices.softDelete, false)
                    )
                );

            if (!invoice) {
                return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
            }

            // Get all payments for this invoice
            const invoicePayments = await db
                .select()
                .from(payments)
                .where(
                    and(
                        eq(payments.invoiceId, id),
                        eq(payments.softDelete, false)
                    )
                );

            return NextResponse.json({ data: invoicePayments });
        } catch (error) {
            console.error('Error fetching payments:', error);
            return NextResponse.json(
                { message: 'Failed to fetch payments' },
                { status: 500 }
            );
        }
    });
}

// POST /api/invoices/[invoiceId]/payments - Record a payment
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    return withAuth<any>(request, async (authInfo) => {
        try {
            const { invoiceId } = await params;
            const id = parseInt(invoiceId);
            const { companyId } = authInfo;

            // Verify the invoice exists and belongs to the company
            const [invoice] = await db
                .select()
                .from(invoices)
                .where(
                    and(
                        eq(invoices.id, id),
                        eq(invoices.companyId, companyId),
                        eq(invoices.softDelete, false)
                    )
                );

            if (!invoice) {
                return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
            }

            // Don't allow payments on paid or cancelled invoices
            if (invoice.status === 'paid') {
                return NextResponse.json(
                    { message: 'Invoice is already fully paid' },
                    { status: 400 }
                );
            }
            if (invoice.status === 'cancelled') {
                return NextResponse.json(
                    { message: 'Cannot record payment on a cancelled invoice' },
                    { status: 400 }
                );
            }

            // Validate request body
            const body = await request.json();
            const validationResult = recordPaymentSchema.safeParse(body);

            if (!validationResult.success) {
                return NextResponse.json(
                    { message: 'Validation failed', errors: validationResult.error.format() },
                    { status: 400 }
                );
            }

            const { amount, paymentDate, paymentMethod, notes } = validationResult.data;

            // Check that payment doesn't exceed remaining balance
            const invoiceTotal = parseFloat(invoice.total);
            const currentAmountPaid = parseFloat(invoice.amountPaid || '0');
            const remainingBalance = invoiceTotal - currentAmountPaid;

            if (amount > remainingBalance + 0.01) { // Small tolerance for floating point
                return NextResponse.json(
                    { message: `Payment amount (${amount}) exceeds remaining balance (${remainingBalance.toFixed(2)})` },
                    { status: 400 }
                );
            }

            // Create the payment record
            const now = new Date().toISOString();
            const [paymentInsertResult] = await db.insert(payments).values({
                companyId,
                invoiceId: id,
                clientId: invoice.clientId,
                amount: amount.toFixed(2),
                currency: invoice.currency,
                paymentDate: paymentDate.toISOString(),
                paymentMethod,
                status: 'completed',
                notes: notes || null,
                createdAt: now,
                updatedAt: now,
                softDelete: false,
            });

            // Calculate new total paid
            const newAmountPaid = currentAmountPaid + amount;
            const isFullyPaid = newAmountPaid >= invoiceTotal - 0.01; // Small tolerance

            // Update invoice amountPaid and status
            const newStatus = isFullyPaid ? 'paid' as const : 'partially_paid' as const;
            await db
                .update(invoices)
                .set({
                    amountPaid: newAmountPaid.toFixed(2),
                    status: newStatus,
                    updatedAt: now,
                    ...(isFullyPaid ? { paidAt: now } : {}),
                })
                .where(eq(invoices.id, id));

            // If fully paid, create income record
            if (isFullyPaid) {
                await db.insert(income).values({
                    companyId,
                    clientId: invoice.clientId,
                    invoiceId: id,
                    source: 'Invoice Payment',
                    description: `Payment for Invoice #${invoice.invoiceNumber}`,
                    amount: invoiceTotal.toString(),
                    currency: invoice.currency,
                    incomeDate: now,
                    recurring: 'none',
                    categoryId: null,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            // Fetch the created payment
            const [createdPayment] = await db
                .select()
                .from(payments)
                .where(eq(payments.id, paymentInsertResult.insertId));

            // Fetch updated invoice
            const [updatedInvoice] = await db
                .select()
                .from(invoices)
                .where(eq(invoices.id, id));

            return NextResponse.json({
                payment: createdPayment,
                invoice: updatedInvoice,
            }, { status: 201 });
        } catch (error) {
            console.error('Error recording payment:', error);
            return NextResponse.json(
                { message: 'Failed to record payment' },
                { status: 500 }
            );
        }
    });
}
