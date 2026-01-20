import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accounts } from '@/lib/db/schema';
import { and, eq, like, desc, count } from 'drizzle-orm';
import { accountSchema, accountQuerySchema } from '@/lib/validations/account';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/accounts - List all accounts
export async function GET(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId } = authInfo;
      
      // Parse and validate query parameters
      const searchParams = request.nextUrl.searchParams;
      const queryValidation = accountQuerySchema.safeParse({
        page: searchParams.get('page') || undefined,
        limit: searchParams.get('limit') || undefined,
        type: searchParams.get('type') || undefined,
        search: searchParams.get('search') || undefined,
      });
      
      if (!queryValidation.success) {
        return NextResponse.json(
          { message: 'Invalid query parameters', errors: queryValidation.error.format() },
          { status: 400 }
        );
      }
      
      const { page, limit, type, search } = queryValidation.data;
      const offset = (page - 1) * limit;
      
      // Build query conditions
      let conditions = and(
        eq(accounts.companyId, companyId),
        eq(accounts.softDelete, false)
      );
      
      // Add type filter if provided and not 'all'
      if (type && type !== 'all') {
        conditions = and(conditions, eq(accounts.type, type));
      }
      
      // Add search filter if provided
      if (search) {
        conditions = and(
          conditions,
          like(accounts.name, `%${search}%`)
        );
      }
      
      // Count total matching accounts
      const [{ value: total }] = await db
        .select({ value: count() })
        .from(accounts)
        .where(conditions);
      
      // Retrieve accounts with pagination
      const accountsList = await db
        .select()
        .from(accounts)
        .where(conditions)
        .orderBy(desc(accounts.createdAt))
        .limit(limit)
        .offset(offset);
      
      return NextResponse.json({
        data: accountsList,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
      
    } catch (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json(
        { message: 'Failed to fetch accounts' },
        { status: 500 }
      );
    }
  });
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  return withAuth(request, async (authInfo): Promise<NextResponse<any>> => {
    try {
      const { companyId } = authInfo;
      
      // Parse and validate request body
      const body = await request.json();
      const validation = accountSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }
      
      const { name, type, currency, accountNumber, initialBalance } = validation.data;
      
      // Create new account
      const [newAccount] = await db
        .insert(accounts)
        .values({
          companyId,
          name,
          type,
          currency,
          accountNumber: accountNumber || null,
          initialBalance: initialBalance.toString(),
          currentBalance: initialBalance.toString(), // Initially set to the same as initialBalance
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          softDelete: false,
        })
        .returning();
      
      return NextResponse.json(newAccount, { status: 201 });
      
    } catch (error) {
      console.error('Error creating account:', error);
      return NextResponse.json(
        { message: 'Failed to create account' },
        { status: 500 }
      );
    }
  });
} 