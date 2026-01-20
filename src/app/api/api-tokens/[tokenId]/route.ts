import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { z } from 'zod';

const paramsSchema = z.object({
  tokenId: z.string().refine((val) => !isNaN(parseInt(val)), {
    message: 'Token ID must be a number',
  }),
});

// DELETE /api/api-tokens/[tokenId] - Revoke an API token
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { userId, companyId } = authInfo;
      const { tokenId } = await params;
      
      const paramsValidation = paramsSchema.safeParse({ tokenId });

      if (!paramsValidation.success) {
        return NextResponse.json(
          { message: 'Invalid token ID', errors: paramsValidation.error.format() },
          { status: 400 }
        );
      }
      
      const id = parseInt(paramsValidation.data.tokenId);

      const [revokedToken] = await db
        .update(apiTokens)
        .set({ revokedAt: new Date().toISOString() })
        .where(
          and(
            eq(apiTokens.id, id),
            eq(apiTokens.userId, userId), // Ensure token belongs to the user
            eq(apiTokens.companyId, companyId),
            isNull(apiTokens.revokedAt)
          )
        )
        .returning({ id: apiTokens.id });

      if (!revokedToken) {
        return NextResponse.json({ message: 'API token not found or already revoked' }, { status: 404 });
      }

      return NextResponse.json({ message: 'API token revoked successfully' });
    } catch (error) {
      console.error('Error revoking API token:', error);
      return NextResponse.json({ message: 'Failed to revoke API token' }, { status: 500 });
    }
  });
} 