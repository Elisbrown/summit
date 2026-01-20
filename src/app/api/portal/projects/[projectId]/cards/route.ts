import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientProjects, boards, cards } from '@/lib/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';
import { cardSchema, cardMoveSchema } from '@/lib/validations/project';

// Helper to verify client access to project
async function verifyClientAccess(projectId: number, clientId: number) {
  const [access] = await db
    .select()
    .from(clientProjects)
    .where(and(eq(clientProjects.projectId, projectId), eq(clientProjects.clientId, clientId)));
  return !!access;
}

// POST /api/portal/projects/[projectId]/cards - Create card
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId } = await params;
    const pId = parseInt(projectId);
    const body = await request.json();

    if (isNaN(pId)) return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });

    // Verify access
    if (!await verifyClientAccess(pId, session.clientId)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Validate
    const validation = cardSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
    }

    const { boardId, title, description, position, priority, startDate, dueDate } = validation.data;

    // Verify board belongs to project
    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, boardId), eq(boards.projectId, pId)));

    if (!board) return NextResponse.json({ message: 'Board not found' }, { status: 404 });

    // Get max position if not provided
    let cardPosition = position;
    if (cardPosition === undefined) {
      const existingCards = await db
        .select()
        .from(cards)
        .where(and(eq(cards.boardId, boardId), eq(cards.softDelete, false)));
      cardPosition = existingCards.length;
    }

    // Create card
    const [newCard] = await db
      .insert(cards)
      .values({
        boardId,
        title,
        description: description || null,
        position: cardPosition,
        priority: priority || 'medium',
        startDate: startDate ? startDate.toISOString() : null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        softDelete: false,
      })
      .returning();

    return NextResponse.json(newCard, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json({ message: 'Failed to create card' }, { status: 500 });
  }
}

// PUT /api/portal/projects/[projectId]/cards - Move card
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId } = await params;
    const pId = parseInt(projectId);
    const body = await request.json();

    if (isNaN(pId)) return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });

    if (!await verifyClientAccess(pId, session.clientId)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const validation = cardMoveSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
    }

    const { cardId, targetBoardId, newPosition } = validation.data;

    // Verify card exists
    const [card] = await db
      .select()
      .from(cards)
      .innerJoin(boards, eq(cards.boardId, boards.id))
      .where(and(eq(cards.id, cardId), eq(boards.projectId, pId), eq(cards.softDelete, false)));

    if (!card) return NextResponse.json({ message: 'Card not found' }, { status: 404 });

    // Verify target board
    const [targetBoard] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, targetBoardId), eq(boards.projectId, pId)));

    if (!targetBoard) return NextResponse.json({ message: 'Target board not found' }, { status: 404 });

    // Update card position
    await db
      .update(cards)
      .set({
        boardId: targetBoardId,
        position: newPosition,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(cards.id, cardId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error moving card:', error);
    return NextResponse.json({ message: 'Failed to move card' }, { status: 500 });
  }
}
