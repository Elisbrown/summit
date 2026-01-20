import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientProjects, boards, cards, cardAssignees, users } from '@/lib/db/schema';
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

// GET single card details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; cardId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId, cardId } = await params;
    const pId = parseInt(projectId);
    const cId = parseInt(cardId);

    if (isNaN(pId) || isNaN(cId)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    if (!await verifyClientAccess(pId, session.clientId)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const [card] = await db
      .select()
      .from(cards)
      .innerJoin(boards, eq(cards.boardId, boards.id))
      .where(and(eq(cards.id, cId), eq(boards.projectId, pId), eq(cards.softDelete, false)));

    if (!card) return NextResponse.json({ message: 'Card not found' }, { status: 404 });

    // Get assignees
    const assignees = await db
      .select({
        id: cardAssignees.id,
        userId: cardAssignees.userId,
        user: { name: users.name, email: users.email },
      })
      .from(cardAssignees)
      .innerJoin(users, eq(cardAssignees.userId, users.id))
      .where(eq(cardAssignees.cardId, cId));

    return NextResponse.json({ ...card.cards, assignees });
  } catch (error) {
    console.error('Error fetching card:', error);
    return NextResponse.json({ message: 'Failed to fetch card' }, { status: 500 });
  }
}

// PUT update card
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; cardId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId, cardId } = await params;
    const pId = parseInt(projectId);
    const cId = parseInt(cardId);
    const body = await request.json();

    if (isNaN(pId) || isNaN(cId)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    if (!await verifyClientAccess(pId, session.clientId)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Verify card exists and belongs to project
    const [existing] = await db
      .select()
      .from(cards)
      .innerJoin(boards, eq(cards.boardId, boards.id))
      .where(and(eq(cards.id, cId), eq(boards.projectId, pId), eq(cards.softDelete, false)));

    if (!existing) return NextResponse.json({ message: 'Card not found' }, { status: 404 });

    const { title, description, priority, startDate, dueDate, completedAt, assigneeIds } = body;

    // Update card (sequential operations for SQLite)
    const [updated] = await db
      .update(cards)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate).toISOString() : null }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate).toISOString() : null }),
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt).toISOString() : null }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cards.id, cId))
      .returning();

    // Update assignees if provided
    if (assigneeIds !== undefined && Array.isArray(assigneeIds)) {
      // Remove existing
      await db.delete(cardAssignees).where(eq(cardAssignees.cardId, cId));
      
      // Add new
      if (assigneeIds.length > 0) {
        for (const aId of assigneeIds) {
           await db.insert(cardAssignees).values({
             cardId: cId,
             userId: aId,
             createdAt: new Date().toISOString(),
           }).onConflictDoNothing();
        }
      }
    }
    const result = updated;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json({ message: 'Failed to update card' }, { status: 500 });
  }
}

// DELETE card (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; cardId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId, cardId } = await params;
    const pId = parseInt(projectId);
    const cId = parseInt(cardId);

    if (isNaN(pId) || isNaN(cId)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    if (!await verifyClientAccess(pId, session.clientId)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const [existing] = await db
      .select()
      .from(cards)
      .innerJoin(boards, eq(cards.boardId, boards.id))
      .where(and(eq(cards.id, cId), eq(boards.projectId, pId), eq(cards.softDelete, false)));

    if (!existing) return NextResponse.json({ message: 'Card not found' }, { status: 404 });

    await db
      .update(cards)
      .set({ softDelete: true, updatedAt: new Date().toISOString() })
      .where(eq(cards.id, cId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json({ message: 'Failed to delete card' }, { status: 500 });
  }
}
