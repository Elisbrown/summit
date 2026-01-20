import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectMembers, boards, cards, cardAssignees, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { cardSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/projects/[projectId]/cards/[cardId] - Get card with assignees
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; cardId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId, cardId } = await params;
      const { companyId } = authInfo;
      const pId = parseInt(projectId);
      const cId = parseInt(cardId);
      
      if (isNaN(pId) || isNaN(cId)) {
        return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
      }
      
      // Verify project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, pId), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Get card
      const [card] = await db
        .select()
        .from(cards)
        .where(and(eq(cards.id, cId), eq(cards.softDelete, false)));
      
      if (!card) {
        return NextResponse.json({ message: 'Card not found' }, { status: 404 });
      }
      
      // Verify card belongs to project
      const [board] = await db
        .select()
        .from(boards)
        .where(and(eq(boards.id, card.boardId), eq(boards.projectId, pId)));
      
      if (!board) {
        return NextResponse.json({ message: 'Card does not belong to this project' }, { status: 400 });
      }
      
      // Get assignees
      const assignees = await db
        .select({
          id: cardAssignees.id,
          userId: cardAssignees.userId,
          user: {
            name: users.name,
            email: users.email,
          },
        })
        .from(cardAssignees)
        .leftJoin(users, eq(cardAssignees.userId, users.id))
        .where(eq(cardAssignees.cardId, cId));
      
      return NextResponse.json({ ...card, assignees, board });
    } catch (error) {
      console.error('Error fetching card:', error);
      return NextResponse.json({ message: 'Failed to fetch card' }, { status: 500 });
    }
  });
}

// PUT /api/projects/[projectId]/cards/[cardId] - Update card
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; cardId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId, cardId } = await params;
      const { companyId, userId } = authInfo;
      const pId = parseInt(projectId);
      const cId = parseInt(cardId);
      const body = await request.json();
      
      if (isNaN(pId) || isNaN(cId)) {
        return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
      }
      
      // Verify project and membership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, pId), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, pId), eq(projectMembers.userId, userId)));
      
      if ((!membership || membership.role === 'viewer') && authInfo.role !== 'admin') {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Get card
      const [card] = await db
        .select()
        .from(cards)
        .where(and(eq(cards.id, cId), eq(cards.softDelete, false)));
      
      if (!card) {
        return NextResponse.json({ message: 'Card not found' }, { status: 404 });
      }
      
      // Verify card belongs to project
      const [board] = await db
        .select()
        .from(boards)
        .where(and(eq(boards.id, card.boardId), eq(boards.projectId, pId)));
      
      if (!board) {
        return NextResponse.json({ message: 'Card does not belong to this project' }, { status: 400 });
      }
      
      // Validate (partial)
      const validation = cardSchema.partial().safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      const { title, description, priority, startDate, dueDate, completedAt, assigneeIds } = validation.data;
      
      // Update card (sequential operations for SQLite compatibility)
      // Update card fields - convert Date objects to ISO strings for SQLite
      const [updated] = await db
        .update(cards)
        .set({
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(priority !== undefined && { priority }),
          ...(startDate !== undefined && { startDate: startDate ? startDate.toISOString() : null }),
          ...(dueDate !== undefined && { dueDate: dueDate ? dueDate.toISOString() : null }),
          ...(completedAt !== undefined && { completedAt: completedAt ? completedAt.toISOString() : null }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(cards.id, cId))
        .returning();
      
      // Update assignees if provided
      if (assigneeIds !== undefined) {
        // Remove existing
        await db.delete(cardAssignees).where(eq(cardAssignees.cardId, cId));
        
        // Add new
        if (assigneeIds.length > 0) {
          const members = await db
            .select({ userId: projectMembers.userId })
            .from(projectMembers)
            .where(eq(projectMembers.projectId, pId));
          
          const memberIds = members.map(m => m.userId);
          
          for (const aId of assigneeIds) {
            if (memberIds.includes(aId)) {
              await db.insert(cardAssignees).values({
                cardId: cId,
                userId: aId,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      }
      
      const result = updated;
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('Error updating card:', error);
      return NextResponse.json({ message: 'Failed to update card' }, { status: 500 });
    }
  });
}

// DELETE /api/projects/[projectId]/cards/[cardId] - Soft delete card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; cardId: string }> }
) {
  return withAuth(request, async (authInfo) => {
    try {
      const { projectId, cardId } = await params;
      const { companyId, userId } = authInfo;
      const pId = parseInt(projectId);
      const cId = parseInt(cardId);
      
      if (isNaN(pId) || isNaN(cId)) {
        return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
      }
      
      // Verify project and membership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, pId), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, pId), eq(projectMembers.userId, userId)));
      
      if ((!membership || membership.role === 'viewer') && authInfo.role !== 'admin') {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Get card
      const [card] = await db
        .select()
        .from(cards)
        .where(and(eq(cards.id, cId), eq(cards.softDelete, false)));
      
      if (!card) {
        return NextResponse.json({ message: 'Card not found' }, { status: 404 });
      }
      
      // Verify card belongs to project
      const [board] = await db
        .select()
        .from(boards)
        .where(and(eq(boards.id, card.boardId), eq(boards.projectId, pId)));
      
      if (!board) {
        return NextResponse.json({ message: 'Card does not belong to this project' }, { status: 400 });
      }
      
      // Soft delete
      await db
        .update(cards)
        .set({ softDelete: true, updatedAt: new Date().toISOString() })
        .where(eq(cards.id, cId));
      
      return NextResponse.json({ message: 'Card deleted' });
    } catch (error) {
      console.error('Error deleting card:', error);
      return NextResponse.json({ message: 'Failed to delete card' }, { status: 500 });
    }
  });
}
