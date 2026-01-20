import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientProjects, boards, cards } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';

// Helper to verify client access
async function verifyClientAccess(projectId: number, clientId: number) {
  const [access] = await db
    .select()
    .from(clientProjects)
    .where(and(eq(clientProjects.projectId, projectId), eq(clientProjects.clientId, clientId)));
  return !!access;
}

// DELETE board/column
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; boardId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId, boardId } = await params;
    const pId = parseInt(projectId);
    const bId = parseInt(boardId);

    if (isNaN(pId) || isNaN(bId)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    if (!await verifyClientAccess(pId, session.clientId)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Verify board belongs to project
    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, bId), eq(boards.projectId, pId)));

    if (!board) return NextResponse.json({ message: 'Board not found' }, { status: 404 });

    // Delete cards first (cascade might handle this, but be explicit)
    await db.delete(cards).where(eq(cards.boardId, bId));
    
    // Delete board
    await db.delete(boards).where(eq(boards.id, bId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting board:', error);
    return NextResponse.json({ message: 'Failed to delete board' }, { status: 500 });
  }
}
