import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { transactions, accounts, invoices, expenses, income } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { format } from 'date-fns';

const updateTransactionSchema = z.object({
  accountId: z.number().positive(),
  amount: z.number().or(z.string()),
  description: z.string().min(1, 'Description is required'),
  type: z.enum(['credit', 'debit']),
  currency: z.string().default('USD'),
  transactionDate: z.coerce.date(),
  categoryId: z.number().optional().nullable(),
  relatedInvoiceId: z.number().optional().nullable(),
  relatedExpenseId: z.number().optional().nullable(),
  relatedIncomeId: z.number().optional().nullable(),
  reconciled: z.boolean().optional(),
  status: z.enum(['completed', 'pending', 'cancelled']).default('completed'),
});

// GET /api/transactions/[transactionId] - Get transaction details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { transactionId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(transactionId);

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid transaction ID' }, { status: 400 });
      }

      // Fetch transaction with account details
      const transactionResults = await db
        .select({
          transaction: transactions,
          account: accounts,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(transactions.id, id),
            eq(transactions.companyId, companyId),
            eq(transactions.softDelete, false)
          )
        )
        .limit(1);

      if (!transactionResults.length) {
        return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
      }

      const { transaction, account } = transactionResults[0];

      // Fetch related entity details based on which relatedId is present
      let relatedEntity = null;
      if (transaction.relatedInvoiceId) {
        const [invoice] = await db
          .select()
          .from(invoices)
          .where(eq(invoices.id, transaction.relatedInvoiceId));
        
        if (invoice) {
          relatedEntity = { type: 'invoice', data: invoice };
        }
      } else if (transaction.relatedExpenseId) {
        const [expense] = await db
          .select()
          .from(expenses)
          .where(eq(expenses.id, transaction.relatedExpenseId));
        
        if (expense) {
          relatedEntity = { type: 'expense', data: expense };
        }
      } else if (transaction.relatedIncomeId) {
        const [incomeItem] = await db
          .select()
          .from(income)
          .where(eq(income.id, transaction.relatedIncomeId));
        
        if (incomeItem) {
          relatedEntity = { type: 'income', data: incomeItem };
        }
      }

      return NextResponse.json({
        ...transaction,
        amount: Number(transaction.amount),
        account: account ? {
          id: account.id,
          name: account.name,
          type: account.type,
          currentBalance: account.currentBalance,
        } : null,
        relatedEntity,
      });

    } catch (error) {
      console.error('Error fetching transaction:', error);
      return NextResponse.json({ message: 'Failed to fetch transaction' }, { status: 500 });
    }
  });
}

// PUT /api/transactions/[transactionId] - Update transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { transactionId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(transactionId);
      const body = await request.json();

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid transaction ID' }, { status: 400 });
      }

      // Validate body
      const validation = updateTransactionSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }

      const { 
        accountId, amount, description, type, status,
        currency, transactionDate, categoryId, relatedInvoiceId, relatedExpenseId, relatedIncomeId, reconciled
      } = validation.data;

      // Check if transaction exists
      const existingTransaction = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.companyId, companyId), eq(transactions.softDelete, false)));

      if (!existingTransaction.length) {
        return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
      }

      // Verify account belongs to company
      const [account] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, accountId), eq(accounts.companyId, companyId)));

      if (!account) {
        return NextResponse.json({ message: 'Account not found' }, { status: 404 });
      }

      // Calculate balance changes
      let originalBalance = parseFloat(account.currentBalance);
      const originalAmount = parseFloat(existingTransaction[0].amount);
      const originalType = existingTransaction[0].type;

      // Reverse original transaction
      if (originalType === 'credit') {
        originalBalance -= originalAmount;
      } else if (originalType === 'debit') {
        originalBalance += originalAmount;
      }

      // Apply new transaction
      const newAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      let newBalance = originalBalance;
      if (type === 'credit') {
        newBalance += newAmount;
      } else if (type === 'debit') {
        newBalance -= newAmount;
      }

      // Update transaction
      const [updatedTransaction] = await db
        .update(transactions)
        .set({
          accountId,
          amount: newAmount.toString(),
          description,
          type,

          currency,
          transactionDate: format(transactionDate, 'yyyy-MM-dd'),
          categoryId: categoryId || null,
          relatedInvoiceId: relatedInvoiceId || null,
          relatedExpenseId: relatedExpenseId || null,
          relatedIncomeId: relatedIncomeId || null,
          reconciled: !!reconciled,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(transactions.id, id))
        .returning();

      // Update account balance
      const [updatedAccount] = await db
        .update(accounts)
        .set({
          currentBalance: newBalance.toString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, accountId))
        .returning();

      return NextResponse.json({
        ...updatedTransaction,
        account: {
          id: updatedAccount.id,
          name: updatedAccount.name,
          type: updatedAccount.type,
          currentBalance: updatedAccount.currentBalance,
        }
      });

    } catch (error) {
      console.error('Error updating transaction:', error);
      return NextResponse.json({ message: 'Failed to update transaction' }, { status: 500 });
    }
  });
}

// DELETE /api/transactions/[transactionId] - Delete transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { transactionId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(transactionId);

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid transaction ID' }, { status: 400 });
      }

      // Check if transaction exists
      const existingTransaction = await db
        .select({
          transaction: transactions,
          account: accounts,
        })
        .from(transactions)
        .leftJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(transactions.id, id),
            eq(transactions.companyId, companyId),
            eq(transactions.softDelete, false)
          )
        )
        .limit(1);

      if (!existingTransaction.length) {
        return NextResponse.json({ message: 'Transaction not found' }, { status: 404 });
      }

      const { transaction, account } = existingTransaction[0];

      if (!account) {
         // If account is missing (soft deleted?), just delete transaction?
         // Or just mark as deleted.
      } else {
         // Reverse balance effect
         let currentBalance = parseFloat(account.currentBalance);
         const transactionAmount = parseFloat(transaction.amount);

         if (transaction.type === 'credit') {
           currentBalance -= transactionAmount;
         } else if (transaction.type === 'debit') {
           currentBalance += transactionAmount;
         }

          // Update account
          await db
            .update(accounts)
            .set({
              currentBalance: currentBalance.toString(),
              updatedAt: new Date().toISOString(),
            })
            .where(eq(accounts.id, account.id));
      }

      // Soft delete transaction
      await db
        .update(transactions)
        .set({ softDelete: true, updatedAt: new Date().toISOString() })
        .where(eq(transactions.id, id));

      return NextResponse.json({ message: 'Transaction deleted successfully' });

    } catch (error) {
      console.error('Error deleting transaction:', error);
      return NextResponse.json({ message: 'Failed to delete transaction' }, { status: 500 });
    }
  });
}