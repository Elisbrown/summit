import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectMembers, boards, cards, cardAssignees, users } from '@/lib/db/schema';
import { and, eq, asc, or } from 'drizzle-orm';
import { cardSchema, cardMoveSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/projects/[projectId]/cards - List all cards in project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId } = authInfo;
      const id = parseInt(projectId);
      
      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
      }
      
      // Verify project exists and belongs to company
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check membership
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, userId)
        ));
      
      if (!membership && authInfo.role !== 'admin') {
         // Viewers can view cards
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Get boards for the project
      const projectBoards = await db
        .select({ id: boards.id })
        .from(boards)
        .where(eq(boards.projectId, id));
        
      const boardIds = projectBoards.map(b => b.id);
      
      if (boardIds.length === 0) {
        return NextResponse.json([]);
      }
      
      // Get cards
      const projectCards = await db
        .select()
        .from(cards)
        .where(and(
          or(...boardIds.map(bId => eq(cards.boardId, bId))),
          eq(cards.softDelete, false)
        ))
        .orderBy(asc(cards.position));
      
      return NextResponse.json(projectCards);
    } catch (error) {
      console.error('Error fetching cards:', error);
      return NextResponse.json({ message: 'Failed to fetch cards' }, { status: 500 });
    }
  });
}

// POST /api/projects/[projectId]/cards - Create card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId } = authInfo;
      const pId = parseInt(projectId);
      const body = await request.json();
      
      if (isNaN(pId)) {
        return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
      }
      
      // Verify project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, pId), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check membership
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, pId), eq(projectMembers.userId, userId)));
      
      if ((!membership || membership.role === 'viewer') && authInfo.role !== 'admin') {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Validate
      const validation = cardSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      const { boardId, title, description, position, priority, startDate, dueDate, assigneeIds } = validation.data;
      
      // Verify board belongs to project
      const [board] = await db
        .select()
        .from(boards)
        .where(and(eq(boards.id, boardId), eq(boards.projectId, pId)));
      
      if (!board) {
        return NextResponse.json({ message: 'Board not found' }, { status: 404 });
      }
      
      // Get max position if not provided
      let cardPosition = position;
      if (cardPosition === undefined) {
        const existingCards = await db
          .select()
          .from(cards)
          .where(and(eq(cards.boardId, boardId), eq(cards.softDelete, false)));
        cardPosition = existingCards.length;
      }
      
      // Create card (sequential operations for SQLite)
      const [newCard] = await db
        .insert(cards)
        .values({
          boardId,
          title,
          description: description || null,
          position: cardPosition!,
          priority: priority || 'medium',
          startDate: startDate ? startDate.toISOString() : null,
          dueDate: dueDate ? dueDate.toISOString() : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          softDelete: false,
        })
        .returning();
      
      // Add assignees
      if (assigneeIds && assigneeIds.length > 0) {
        // Verify assignees are project members
        const members = await db
          .select({ userId: projectMembers.userId })
          .from(projectMembers)
          .where(eq(projectMembers.projectId, pId));
        
        const memberIds = members.map(m => m.userId);
        
        for (const aId of assigneeIds) {
          if (memberIds.includes(aId)) {
            await db.insert(cardAssignees).values({
              cardId: newCard.id,
              userId: aId,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
      
      const result = newCard;
      
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('Error creating card:', error);
      return NextResponse.json({ message: 'Failed to create card' }, { status: 500 });
    }
  });
}

// PUT /api/projects/[projectId]/cards - Move card (drag-and-drop)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId } = authInfo;
      const pId = parseInt(projectId);
      const body = await request.json();
      
      if (isNaN(pId)) {
        return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
      }
      
      // Verify project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, pId), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check membership
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, pId), eq(projectMembers.userId, userId)));
      
      if ((!membership || membership.role === 'viewer') && authInfo.role !== 'admin') {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Validate
      const validation = cardMoveSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      const { cardId, targetBoardId, newPosition } = validation.data;
      
      // Verify card exists and get current board
      const [card] = await db
        .select()
        .from(cards)
        .where(and(eq(cards.id, cardId), eq(cards.softDelete, false)));
      
      if (!card) {
        return NextResponse.json({ message: 'Card not found' }, { status: 404 });
      }
      
      // Verify card belongs to this project
      const [currentBoard] = await db
        .select()
        .from(boards)
        .where(eq(boards.id, card.boardId));
      
      if (!currentBoard || currentBoard.projectId !== pId) {
        return NextResponse.json({ message: 'Card does not belong to this project' }, { status: 400 });
      }
      
      // Verify target board belongs to project
      const [targetBoard] = await db
        .select()
        .from(boards)
        .where(and(eq(boards.id, targetBoardId), eq(boards.projectId, pId)));
      
      if (!targetBoard) {
        return NextResponse.json({ message: 'Target board not found' }, { status: 404 });
      }
      
      // Update card position (using sequential updates for SQLite compatibility)
      // If moving to different board, update positions in both
      if (card.boardId !== targetBoardId) {
        // Shift cards in old board
        const oldBoardCards = await db
          .select()
          .from(cards)
          .where(and(eq(cards.boardId, card.boardId), eq(cards.softDelete, false)))
          .orderBy(asc(cards.position));
        
        for (let i = 0; i < oldBoardCards.length; i++) {
          if (oldBoardCards[i].id !== cardId && oldBoardCards[i].position > card.position) {
            await db
              .update(cards)
              .set({ position: oldBoardCards[i].position - 1, updatedAt: new Date().toISOString() })
              .where(eq(cards.id, oldBoardCards[i].id));
          }
        }
      }
      
      // Shift cards in target board to make room
      const targetBoardCards = await db
        .select()
        .from(cards)
        .where(and(
          eq(cards.boardId, targetBoardId), 
          eq(cards.softDelete, false)
        ))
        .orderBy(asc(cards.position));
      
      for (const c of targetBoardCards) {
        if (c.id !== cardId && c.position >= newPosition) {
          await db
            .update(cards)
            .set({ position: c.position + 1, updatedAt: new Date().toISOString() })
            .where(eq(cards.id, c.id));
        }
      }
      
      // Determine completion status
      const isCompletedBoard = ['done', 'completed'].includes(targetBoard.title.toLowerCase());
      const newCompletedAt = isCompletedBoard ? (card.completedAt || new Date().toISOString()) : null;

      // Update the moved card
      await db
        .update(cards)
        .set({ 
          boardId: targetBoardId, 
          position: newPosition,
          updatedAt: new Date().toISOString(),
          completedAt: newCompletedAt,
        })
        .where(eq(cards.id, cardId));
      
      return NextResponse.json({ message: 'Card moved' });
    } catch (error) {
      console.error('Error moving card:', error);
      return NextResponse.json({ message: 'Failed to move card' }, { status: 500 });
    }
  });
}
