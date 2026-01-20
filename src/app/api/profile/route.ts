import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import * as z from 'zod';
import { hash } from 'bcryptjs';
import { withAuth } from '@/lib/auth/getAuthInfo';

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.password && data.password !== '') {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});
// GET /api/profile - Get current user profile
export async function GET(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { userId } = authInfo;
      
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
        .where(eq(users.id, userId));
      
      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
      
      return NextResponse.json(user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ message: 'Failed to fetch profile' }, { status: 500 });
    }
  });
}
export async function PUT(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { userId } = authInfo;
      const body = await request.json();

      const validation = profileUpdateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }

      const { name, email, password } = validation.data;

      // Check if email is taken by another user
      // Note: We need to check against other users, but ignore the current user
      if (email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser && existingUser.id !== userId) {
          return NextResponse.json(
            { message: 'Email already in use' },
            { status: 400 }
          );
        }
      }

      const updateData: { name: string; email: string; password?: string; updatedAt: string } = {
        name,
        email,
        updatedAt: new Date().toISOString(),
      };

      if (password && password.length >= 6) {
        updateData.password = await hash(password, 12);
      }

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      return NextResponse.json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { message: 'Failed to update profile' },
        { status: 500 }
      );
    }
  });
}
