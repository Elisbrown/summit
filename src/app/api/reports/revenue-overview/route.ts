import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { and, eq, sql, gte, lte } from 'drizzle-orm';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/reports/revenue-overview
export async function GET(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId } = authInfo;
      
      // Parse query parameters (defaults to last 6 months)
      const searchParams = request.nextUrl.searchParams;
      const months = parseInt(searchParams.get('months') || '6');
      const endDate = searchParams.get('endDate') 
        ? new Date(searchParams.get('endDate') as string) 
        : new Date();
      const startDate = subMonths(startOfMonth(endDate), months - 1);
      
      // Get monthly revenue from paid invoices using Drizzle query builder
      const monthlyRevenueResult = await db
        .select({
          month: sql<string>`strftime('%Y-%m', ${invoices.paidAt})`,
          revenue: sql<number>`SUM(${invoices.total})`
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.status, 'paid'),
            eq(invoices.softDelete, false),
            gte(invoices.paidAt, startDate.toISOString()),
            lte(invoices.paidAt, endOfMonth(endDate).toISOString())
          )
        )
        .groupBy(sql`strftime('%Y-%m', ${invoices.paidAt})`)
        .orderBy(sql`strftime('%Y-%m', ${invoices.paidAt})`);
      
      // Get count of invoices by status
      const invoiceStatusCountResult = await db
        .select({
          status: invoices.status,
          count: sql<number>`COUNT(*)`
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.companyId, companyId),
            eq(invoices.softDelete, false),
            gte(invoices.createdAt, startDate.toISOString()),
            lte(invoices.createdAt, endOfMonth(endDate).toISOString())
          )
        )
        .groupBy(invoices.status);
      
      // Format months with zero values where no revenue
      const monthlyRevenue: { month: string; revenue: number }[] = [];
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const monthStr = format(currentDate, 'yyyy-MM');
        const found = monthlyRevenueResult.find(item => item.month === monthStr);
        
        monthlyRevenue.push({
          month: monthStr,
          revenue: found ? parseFloat(found.revenue.toString()) : 0
        });
        
        currentDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
      }
      
      // Calculate totals and format status summary
      const totalRevenue = monthlyRevenue.reduce((sum, item) => sum + item.revenue, 0);
      const averageMonthlyRevenue = totalRevenue / months;
      
      // Create a properly typed status counts object
      const statusCounts: Record<string, number> = {};
      invoiceStatusCountResult.forEach(item => {
        statusCounts[item.status] = parseInt(item.count.toString());
      });
      
      return NextResponse.json({
        monthlyRevenue,
        summary: {
          totalRevenue,
          averageMonthlyRevenue,
          invoicesByStatus: statusCounts
        }
      });
      
    } catch (error) {
      console.error('Error generating revenue overview:', error);
      return NextResponse.json(
        { message: 'Failed to generate revenue overview' },
        { status: 500 }
      );
    }
  });
} 