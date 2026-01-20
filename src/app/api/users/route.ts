import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/users - Get all users in the company
export async function GET(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId } = authInfo;
      
      // Get all active users for the company
      const companyUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(
          and(
            eq(users.companyId, companyId),
            eq(users.softDelete, false)
          )
        )
        .orderBy(users.createdAt);
      
      return NextResponse.json(companyUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { message: 'Failed to fetch users' },
        { status: 500 }
      );
    }
  });
} 