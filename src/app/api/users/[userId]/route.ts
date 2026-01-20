import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { z } from 'zod';

const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['admin', 'staff', 'accountant']),
  permissions: z.record(z.string(), z.boolean()).optional(),
});

// GET /api/users/[userId] - Get user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { userId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(userId);

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
      }

      // Fetch user
      const [user] = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,

          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(
          and(
            eq(users.id, id),
            eq(users.companyId, companyId),
            eq(users.softDelete, false)
          )
        );

      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      return NextResponse.json(user);

    } catch (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ message: 'Failed to fetch user' }, { status: 500 });
    }
  });
}

// PUT /api/users/[userId] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { userId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(userId);
      const body = await request.json();

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
      }

      // Check permissions (only admins can update other users, or user can update self - logic might vary)
      // For now, assuming only admins can update users or user updating themselves (but usually sensitive fields restricted)
      // Since this is a simple update, we'll allow it if authInfo.role is admin or match ID.
      // But Schema handles role changes. Only admin should change roles.
      
      const isSelf = id === authInfo.userId;
      const isAdmin = authInfo.role === 'admin';

      if (!isSelf && !isAdmin) {
         return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }

      // Update validation
      const validation = updateUserSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }

      const { name, role, permissions } = validation.data;

      // Only admin can change role/permissions
      if ((role !== undefined || permissions !== undefined) && !isAdmin) {
        return NextResponse.json({ message: 'Only admins can change roles/permissions' }, { status: 403 });
      }

      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({
          name,
          ...(isAdmin ? { role, permissions } : {}),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(users.id, id),
            eq(users.companyId, companyId),
            eq(users.softDelete, false)
          )
        )
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,

        });
      
      if (!updatedUser) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      return NextResponse.json(updatedUser);

    } catch (error) {
      console.error('Error updating user:', error);
      return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }
  });
}

// DELETE /api/users/[userId] - Delete (soft) a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { userId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(userId);

      if (isNaN(id)) {
        return NextResponse.json(
          { message: 'Invalid user ID' },
          { status: 400 }
        );
      }
      
      // Prevent users from deleting themselves
      if (authInfo.userId === id) {
        return NextResponse.json(
          { message: 'You cannot delete your own account' },
          { status: 400 }
        );
      }

      // Only admins can delete users
      if (authInfo.role !== 'admin') {
         // Or check specific permission
         return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }
      
      // Soft delete
      const result = await db
        .update(users)
        .set({
          softDelete: true,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(users.id, id),
            eq(users.companyId, companyId),
            eq(users.softDelete, false)
          )
        )
        .returning({ id: users.id });
      
      if (!result.length) {
        return NextResponse.json(
          { message: 'User not found or already deleted' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        message: 'User deleted successfully' 
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json(
        { message: 'Failed to delete user' },
        { status: 500 }
      );
    }
  });
} 