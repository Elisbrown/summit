import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices, invoiceItems, clients, companies } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { invoiceSchema } from '@/lib/validations/invoice';
import { ZodError } from 'zod';
import { withAuth } from '@/lib/auth/getAuthInfo';

// Define response types
type InvoiceDetailResponse = {
  id: number;
  companyId: number;
  clientId: number;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  tax: string | null;
  taxRate: string | null;
  total: string;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  softDelete: boolean;
  client?: any;
  company?: any;
  items: any[];
};

type ErrorResponse = {
  message: string;
  errors?: any;
};

// GET /api/invoices/[invoiceId] - Get a specific invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      // Validate invoiceId parameter
      const { invoiceId } = await params;
      const id = parseInt(invoiceId);
      const { companyId } = authInfo;

      // Get invoice with client and company data
      const [invoiceWithData] = await db
        .select({
          invoice: invoices,
          client: clients,
          company: {
            name: companies.name,
            email: companies.email,
            phone: companies.phone,
            address: companies.address,
            logoUrl: companies.logoUrl,
            bankAccount: companies.bankAccount,
            defaultCurrency: companies.defaultCurrency,
          },
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(companies, eq(invoices.companyId, companies.id))
        .where(
          and(
            eq(invoices.id, id),
            eq(invoices.companyId, companyId),
            eq(invoices.softDelete, false)
          )
        );

      if (!invoiceWithData) {
        return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
      }

      // Get invoice items
      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id));

      // Format response
      const response = {
        ...invoiceWithData.invoice,
        client: invoiceWithData.client,
        company: invoiceWithData.company,
        items,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error fetching invoice:', error);

      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: 'Invalid invoice ID' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/invoices/[invoiceId] - Update an invoice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      // Validate invoiceId parameter
      const { invoiceId } = await params;
      const id = parseInt(invoiceId);
      const { companyId } = authInfo;

      // Check if invoice exists and belongs to the company
      const existingInvoice = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, id),
            eq(invoices.companyId, companyId),
            eq(invoices.softDelete, false)
          )
        )
        .limit(1);

      if (existingInvoice.length === 0) {
        return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
      }

      // Validate request body
      const body = await request.json();
      const validatedData = invoiceSchema.parse(body);

      // Calculate values based on items, ignoring any client-provided values
      const subtotal = validatedData.items.reduce(
        (sum, item) => sum + item.quantity * parseFloat(item.unitPrice.toString()), 
        0
      );
      // Ensure tax is a percentage between 0-100, not a multiplier
      const taxPercentage = validatedData.taxRate || validatedData.tax || 0;
      const tax = (subtotal * taxPercentage) / 100;
      const total = subtotal + tax;

      // Handle Income Logic
      // If status is "paid", ensuring we have an income record
      // If status was "paid" and is now changed to something else, remove income record
      const isPaid = validatedData.status === 'paid';
      const wasPaid = existingInvoice[0].status === 'paid';

      // Update invoice
      const [updatedInvoice] = await db
        .update(invoices)
        .set({
          clientId: validatedData.clientId,
          invoiceNumber: validatedData.invoiceNumber,
          status: validatedData.status,
          issueDate: validatedData.issueDate.toISOString(),
          dueDate: validatedData.dueDate.toISOString(),
          subtotal: subtotal.toString(),
          taxRate: taxPercentage.toString(),
          tax: tax.toString(),
          total: total.toString(),
          notes: validatedData.notes || null,
          updatedAt: new Date().toISOString(),
          // Set paidAt if status is changed to paid
          paidAt: isPaid && !wasPaid
            ? new Date().toISOString()
            : (isPaid ? existingInvoice[0].paidAt : null), // Reset if not paid
        })
        .where(
          and(
            eq(invoices.id, id),
            eq(invoices.companyId, companyId)
          )
        )
        .returning();

      // Delete existing items
      await db
        .delete(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id));

      // Insert new items
      const itemsToInsert = validatedData.items.map((item) => {
        // Calculate amount server-side regardless of what client sent
        const amount = item.quantity * parseFloat(item.unitPrice.toString());
        
        return {
          invoiceId: id,
          description: item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          amount: amount.toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      const items = await db
        .insert(invoiceItems)
        .values(itemsToInsert)
        .returning();

      // --- INCOME RECORD MANAGEMENT ---
      if (isPaid && !wasPaid) {
        // Invoice just marked as paid - Create income record
        
        // Import income table lazily or at top if not imported
        const { income } = await import('@/lib/db/schema');
        
        await db.insert(income).values({
          companyId,
          clientId: validatedData.clientId,
          invoiceId: id,
          source: 'Invoice Payment',
          description: `Payment for Invoice #${validatedData.invoiceNumber}`,
          amount: total.toString(),
          currency: updatedInvoice.currency,
          incomeDate: new Date().toISOString(), // Use current date for payment
          recurring: 'none',
          categoryId: null, // User can categorize later
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else if (!isPaid && wasPaid) {
        // Invoice was paid, now it's not (e.g., marked as unpaid/draft) - Delete associated income
        const { income } = await import('@/lib/db/schema');
        
        await db
          .delete(income)
          .where(
            and(
              eq(income.invoiceId, id),
              eq(income.companyId, companyId)
            )
          );
      } else if (isPaid && wasPaid && existingInvoice[0].total !== total.toString()) {
          // Amount changed but still paid - Update income record
          const { income } = await import('@/lib/db/schema');
          await db
              .update(income)
              .set({
                  amount: total.toString(),
                  updatedAt: new Date().toISOString(),
              })
              .where(
                  and(
                      eq(income.invoiceId, id),
                      eq(income.companyId, companyId)
                  )
              );
      }

      return NextResponse.json({ ...updatedInvoice, items });
    } catch (error) {
      console.error('Error updating invoice:', error);

      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: 'Validation error', errors: error.errors },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/invoices/[invoiceId] - Soft delete an invoice
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  return withAuth<{ message: string } | ErrorResponse>(request, async (authInfo) => {
    try {
      // Validate invoiceId parameter
      const { invoiceId } = await params;
      const id = parseInt(invoiceId);
      const { companyId } = authInfo;

      // Check if invoice exists
      const existingInvoice = await db
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, id),
            eq(invoices.companyId, companyId),
            eq(invoices.softDelete, false)
          )
        )
        .limit(1);

      if (existingInvoice.length === 0) {
        return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
      }

      // Soft delete invoice
      const [deletedInvoice] = await db
        .update(invoices)
        .set({
          softDelete: true,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(invoices.id, id),
            eq(invoices.companyId, companyId)
          )
        )
        .returning();

      return NextResponse.json({ message: 'Invoice deleted successfully' });
    } catch (error) {
      console.error('Error deleting invoice:', error);

      if (error instanceof ZodError) {
        return NextResponse.json(
          { message: 'Invalid invoice ID' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      );
    }
  });
} 