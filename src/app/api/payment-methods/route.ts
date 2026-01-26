import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { paymentMethods } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { z } from 'zod';

// Validation schema
const paymentMethodSchema = z.object({
  type: z.enum(['mtn_momo', 'orange_money', 'bank_transfer']),
  accountName: z.string().min(1, 'Account name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  bankName: z.string().optional().nullable(),
  bankCode: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  bankAddress: z.string().optional().nullable(),
  isEnabled: z.boolean().optional().default(true),
});

// GET /api/payment-methods - List all payment methods
export async function GET(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId } = authInfo;

      const methods = await db
        .select()
        .from(paymentMethods)
        .where(eq(paymentMethods.companyId, companyId))
        .orderBy(paymentMethods.type);

      return NextResponse.json({ data: methods });
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return NextResponse.json(
        { message: 'Failed to fetch payment methods' },
        { status: 500 }
      );
    }
  });
}

// POST /api/payment-methods - Create a new payment method
export async function POST(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId } = authInfo;
      const body = await request.json();

      // Validate
      const validation = paymentMethodSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }

      const { type, accountName, accountNumber, bankName, bankCode, bankBranch, bankAddress, isEnabled } = validation.data;

      // Check if a payment method of this type already exists
      const [existing] = await db
        .select()
        .from(paymentMethods)
        .where(and(
          eq(paymentMethods.companyId, companyId),
          eq(paymentMethods.type, type)
        ));

      if (existing) {
        return NextResponse.json(
          { message: `A ${type.replace('_', ' ')} payment method already exists. Please edit the existing one.` },
          { status: 409 }
        );
      }

      // Create payment method
      const [newMethod] = await db
        .insert(paymentMethods)
        .values({
          companyId,
          type,
          accountName,
          accountNumber,
          bankName: bankName || null,
          bankCode: bankCode || null,
          bankBranch: bankBranch || null,
          bankAddress: bankAddress || null,
          isEnabled: isEnabled ?? true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();

      return NextResponse.json(newMethod, { status: 201 });
    } catch (error) {
      console.error('Error creating payment method:', error);
      return NextResponse.json(
        { message: 'Failed to create payment method' },
        { status: 500 }
      );
    }
  });
}
