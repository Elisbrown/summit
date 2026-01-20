import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accounts, transactions } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/getAuthInfo';

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['bank', 'cash', 'credit_card']),
  currency: z.string().min(3).max(3),
  accountNumber: z.string().optional().nullable(),
  initialBalance: z.number().or(z.string()).optional(),
});

// GET /api/accounts/[accountId] - Get specific account
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { accountId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(accountId);

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid account ID' }, { status: 400 });
      }

      // Get account
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, id),
            eq(accounts.companyId, companyId),
            eq(accounts.softDelete, false)
          )
        );

      if (!account) {
        return NextResponse.json({ message: 'Account not found' }, { status: 404 });
      }

      // Get recent transactions for the account
      const recentTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, id),
            eq(transactions.softDelete, false)
          )
        )
        .orderBy(desc(transactions.transactionDate))
        .limit(5);

      return NextResponse.json({
        ...account,
        recentTransactions: recentTransactions,
      });

    } catch (error) {
      console.error('Error fetching account:', error);
      return NextResponse.json(
        { message: 'Failed to fetch account' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/accounts/[accountId] - Update account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { accountId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(accountId);
      const body = await request.json();

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid account ID' }, { status: 400 });
      }

      // Validate body
      const validation = updateAccountSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }

      const { name, type, currency, accountNumber, initialBalance } = validation.data;

      // Check if account exists
      const [existingAccount] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, id),
            eq(accounts.companyId, companyId),
            eq(accounts.softDelete, false)
          )
        );

      if (!existingAccount) {
        return NextResponse.json({ message: 'Account not found' }, { status: 404 });
      }

      // Update account
      const [updatedAccount] = await db
        .update(accounts)
        .set({
          name,
          type,
          currency,
          accountNumber: accountNumber || null,
          initialBalance: initialBalance !== undefined ? String(initialBalance) : existingAccount.initialBalance,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, id))
        .returning();

      return NextResponse.json(updatedAccount);

    } catch (error) {
      console.error('Error updating account:', error);
      return NextResponse.json(
        { message: 'Failed to update account' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/accounts/[accountId] - Soft delete account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { accountId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(accountId);

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid account ID' }, { status: 400 });
      }

      // Check if account exists
      const [existingAccount] = await db
        .select()
        .from(accounts)
        .where(
          and(
            eq(accounts.id, id),
            eq(accounts.companyId, companyId),
            eq(accounts.softDelete, false)
          )
        );

      if (!existingAccount) {
        return NextResponse.json({ message: 'Account not found' }, { status: 404 });
      }

      // Check if account has transactions
      const transactionCount = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.accountId, id),
            eq(transactions.softDelete, false)
          )
        )
        .limit(1);

      if (transactionCount.length > 0) {
        return NextResponse.json(
          { message: 'Cannot delete account with existing transactions' },
          { status: 400 }
        );
      }

      // Soft delete
      await db
        .update(accounts)
        .set({ softDelete: true, updatedAt: new Date().toISOString() })
        .where(eq(accounts.id, id));

      return NextResponse.json({ message: 'Account deleted successfully' });

    } catch (error) {
      console.error('Error deleting account:', error);
      return NextResponse.json(
        { message: 'Failed to delete account' },
        { status: 500 }
      );
    }
  });
}