import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { expenses, expenseCategories } from '@/lib/db/schema';
import { and, eq, sql, gte, lte, sum, desc, asc } from 'drizzle-orm';
import { authOptions } from '@/lib/auth/options';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';

// GET /api/reports/expense-breakdown
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !session.user.companyId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const companyId = parseInt(session.user.companyId);
    
    // Parse query parameters for date range
    const searchParams = request.nextUrl.searchParams;
    const months = parseInt(searchParams.get('months') || '12'); // Default to last 12 months
    
    // Calculate date range
    const endDate = new Date();
    const startDate = subMonths(startOfMonth(endDate), months - 1);
    
    // Convert dates to yyyy-MM-dd format for SQL comparison
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    // Get expense totals by category using aggregation (efficient and includes uncategorized)
    const expensesByCategoryResult = await db
      .select({
        name: expenseCategories.name,
        totalAmount: sql`COALESCE(SUM(CAST(${expenses.amount} AS NUMERIC)), 0)`.as('total_amount'),
      })
      .from(expenses)
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(
        and(
          eq(expenses.companyId, companyId),
          eq(expenses.softDelete, false),
          gte(sql`date(${expenses.expenseDate})`, startDateStr),
          lte(sql`date(${expenses.expenseDate})`, endDateStr)
        )
      )
      .groupBy(expenses.categoryId, expenseCategories.name);

    const expensesByCategory = expensesByCategoryResult.map(item => ({
      category: item.name || 'Uncategorized',
      amount: parseFloat(item.totalAmount as string),
    }));
    
    // Sort by amount descending
    expensesByCategory.sort((a, b) => b.amount - a.amount);
    
    // For expenses by month, use SQLite strftime function
    const expensesByMonthResult = await db
      .select({
        month: sql`strftime('%Y-%m', ${expenses.expenseDate})`.as('month'),
        totalAmount: sql`COALESCE(SUM(CAST(${expenses.amount} AS NUMERIC)), 0)`.as('total_amount'),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.companyId, companyId),
          eq(expenses.softDelete, false),
          gte(sql`date(${expenses.expenseDate})`, startDateStr),
          lte(sql`date(${expenses.expenseDate})`, endDateStr)
        )
      )
      .groupBy(sql`strftime('%Y-%m', ${expenses.expenseDate})`)
      .orderBy(sql`strftime('%Y-%m', ${expenses.expenseDate})`);
    
    // Format the data for the frontend
    const expensesByMonth = expensesByMonthResult.map(row => ({
      month: new Date(row.month as string).toLocaleDateString('en-US', { 
        month: 'short', 
        year: 'numeric' 
      }),
      amount: parseFloat(row.totalAmount as string),
    }));
    
    return NextResponse.json({
      expensesByCategory,
      expensesByMonth,
      totalExpenses: expensesByCategory.reduce((sum, item) => sum + item.amount, 0),
    });
    
  } catch (error) {
    console.error('Error generating expense breakdown report:', error);
    return NextResponse.json(
      { message: 'Failed to generate expense breakdown report' },
      { status: 500 }
    );
  }
} 