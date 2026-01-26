import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { paymentMethods } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { z } from 'zod';

// Validation schema for update
const updatePaymentMethodSchema = z.object({
  accountName: z.string().min(1).optional(),
  accountNumber: z.string().min(1).optional(),
  bankName: z.string().optional().nullable(),
  bankCode: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  bankAddress: z.string().optional().nullable(),
  isEnabled: z.boolean().optional(),
});

// GET /api/payment-methods/[id] - Get a single payment method
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { id } = await params;
      const { companyId } = authInfo;
      const methodId = parseInt(id);

      if (isNaN(methodId)) {
        return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
      }

      const [method] = await db
        .select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.id, methodId),
          eq(paymentMethods.companyId, companyId)
        ));

      if (!method) {
        return NextResponse.json({ message: 'Payment method not found' }, { status: 404 });
      }

      return NextResponse.json(method);
    } catch (error) {
      console.error('Error fetching payment method:', error);
      return NextResponse.json(
        { message: 'Failed to fetch payment method' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/payment-methods/[id] - Update a payment method
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { id } = await params;
      const { companyId } = authInfo;
      const methodId = parseInt(id);
      const body = await request.json();

      if (isNaN(methodId)) {
        return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
      }

      // Validate
      const validation = updatePaymentMethodSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }

      // Check existence
      const [existing] = await db
        .select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.id, methodId),
          eq(paymentMethods.companyId, companyId)
        ));

      if (!existing) {
        return NextResponse.json({ message: 'Payment method not found' }, { status: 404 });
      }

      // Update
      const updates: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };

      const { accountName, accountNumber, bankName, bankCode, bankBranch, bankAddress, isEnabled } = validation.data;

      if (accountName !== undefined) updates.accountName = accountName;
      if (accountNumber !== undefined) updates.accountNumber = accountNumber;
      if (bankName !== undefined) updates.bankName = bankName;
      if (bankCode !== undefined) updates.bankCode = bankCode;
      if (bankBranch !== undefined) updates.bankBranch = bankBranch;
      if (bankAddress !== undefined) updates.bankAddress = bankAddress;
      if (isEnabled !== undefined) updates.isEnabled = isEnabled;

      const [updated] = await db
        .update(paymentMethods)
        .set(updates)
        .where(and(
          eq(paymentMethods.id, methodId),
          eq(paymentMethods.companyId, companyId)
        ))
        .returning();

      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error updating payment method:', error);
      return NextResponse.json(
        { message: 'Failed to update payment method' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/payment-methods/[id] - Delete a payment method
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { id } = await params;
      const { companyId } = authInfo;
      const methodId = parseInt(id);

      if (isNaN(methodId)) {
        return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
      }

      // Check existence
      const [existing] = await db
        .select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.id, methodId),
          eq(paymentMethods.companyId, companyId)
        ));

      if (!existing) {
        return NextResponse.json({ message: 'Payment method not found' }, { status: 404 });
      }

      // Delete
      await db
        .delete(paymentMethods)
        .where(and(
          eq(paymentMethods.id, methodId),
          eq(paymentMethods.companyId, companyId)
        ));

      return NextResponse.json({ message: 'Payment method deleted' });
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return NextResponse.json(
        { message: 'Failed to delete payment method' },
        { status: 500 }
      );
    }
  });
}
