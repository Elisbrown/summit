import { NextRequest, NextResponse } from 'next/server';
import { getProfitLossSummary } from '@/lib/reports/profit-loss';
import { z } from 'zod';
import { format, subMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { db } from '@/lib/db';
import { expenses, income } from '@/lib/db/schema';
import { and, eq, gte, lte, sql, sum } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';

// Query parameter validation schema
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/reports/profit-loss - Get profit & loss report
export async function GET(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId } = authInfo;
      
      // Extract query parameters
      const searchParams = request.nextUrl.searchParams;
      let startDate = searchParams.get('startDate');
      let endDate = searchParams.get('endDate');
      
      // If no dates provided, default to last 6 months
      if (!startDate || !endDate) {
        const today = new Date();
        endDate = format(today, 'yyyy-MM-dd');
        startDate = format(subMonths(today, 6), 'yyyy-MM-dd');
      }
      
      // Get profit & loss summary for the specified period
      const summary = await getProfitLossSummary(companyId, startDate, endDate);
      
      // Get monthly breakdown for the chart
      const months = await getMonthlyBreakdown(companyId, startDate, endDate);
      
      return NextResponse.json({
        ...summary,
        months
      });
      
    } catch (error) {
      console.error('Error fetching profit & loss report:', error);
      return NextResponse.json(
        { message: 'Failed to fetch profit & loss report' },
        { status: 500 }
      );
    }
  });
}

// Helper function to get monthly breakdown of income and expenses
async function getMonthlyBreakdown(companyId: number, startDate: string, endDate: string) {
  // Get monthly income
  const monthlyIncome = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${income.incomeDate})`,
      total: sum(sql<number>`CAST(${income.amount} AS DECIMAL)`),
    })
    .from(income)
    .where(
      and(
        eq(income.companyId, companyId),
        gte(sql`date(${income.incomeDate})`, startDate),
        lte(sql`date(${income.incomeDate})`, endDate),
        eq(income.softDelete, false)
      )
    )
    .groupBy(sql`strftime('%Y-%m', ${income.incomeDate})`)
    .orderBy(sql`strftime('%Y-%m', ${income.incomeDate})`);
  
  // Get monthly expenses
  const monthlyExpenses = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${expenses.expenseDate})`,
      total: sum(sql<number>`CAST(${expenses.amount} AS DECIMAL)`),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.companyId, companyId),
        gte(sql`date(${expenses.expenseDate})`, startDate),
        lte(sql`date(${expenses.expenseDate})`, endDate),
        eq(expenses.softDelete, false)
      )
    )
    .groupBy(sql`strftime('%Y-%m', ${expenses.expenseDate})`)
    .orderBy(sql`strftime('%Y-%m', ${expenses.expenseDate})`);

  // Transform the data to get an array of months from startDate to endDate
  const months = [];
  let currentDate = startOfMonth(parseISO(startDate));
  const endDateParsed = endOfMonth(parseISO(endDate));

  while (currentDate <= endDateParsed) {
    const monthStr = format(currentDate, 'yyyy-MM');
    const incomeData = monthlyIncome.find((i) => i.month === monthStr);
    const expenseData = monthlyExpenses.find((e) => e.month === monthStr);
    
    const incomeAmount = Number(incomeData?.total || 0);
    const expenseAmount = Number(expenseData?.total || 0);
    
    months.push({
      month: monthStr,
      income: incomeAmount,
      expenses: expenseAmount,
      profit: incomeAmount - expenseAmount,
    });
    
    currentDate = startOfMonth(subMonths(currentDate, -1)); // Move to next month
  }

  return months;
} 