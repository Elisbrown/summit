import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, clientProjects, boards, cards } from '@/lib/db/schema';
import { and, eq, asc, inArray } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId } = await params;
    const id = parseInt(projectId);

    // Verify Access
    const [access] = await db
      .select()
      .from(clientProjects)
      .where(and(eq(clientProjects.projectId, id), eq(clientProjects.clientId, session.clientId)));

    if (!access) return NextResponse.json({ message: 'Access denied' }, { status: 403 });

    // Fetch Boards (boards table has no softDelete column)
    const projectBoards = await db
      .select()
      .from(boards)
      .where(eq(boards.projectId, id))
      .orderBy(asc(boards.position));

    const boardIds = projectBoards.map(b => b.id);
    let projectCards: any[] = [];

    if (boardIds.length > 0) {
      projectCards = await db
        .select()
        .from(cards)
        .where(and(
          inArray(cards.boardId, boardIds),
          eq(cards.softDelete, false)
        ));
    }

    const boardsWithCards = projectBoards.map(board => ({
      ...board,
      cards: projectCards
        .filter((c: any) => c.boardId === board.id)
        .sort((a: any, b: any) => a.position - b.position),
    }));

    return NextResponse.json({ data: boardsWithCards });
  } catch (error) {
    console.error('Error fetching boards:', error);
    return NextResponse.json({ message: 'Failed to fetch boards' }, { status: 500 });
  }
}

// POST /api/portal/projects/[projectId]/boards - Create board/column
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId } = await params;
    const id = parseInt(projectId);
    const body = await request.json();

    if (isNaN(id)) return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });

    // Verify Access
    const [access] = await db
      .select()
      .from(clientProjects)
      .where(and(eq(clientProjects.projectId, id), eq(clientProjects.clientId, session.clientId)));

    if (!access) return NextResponse.json({ message: 'Access denied' }, { status: 403 });

    const { title } = body;
    if (!title?.trim()) {
      return NextResponse.json({ message: 'Title is required' }, { status: 400 });
    }

    // Get max position
    const existingBoards = await db
      .select()
      .from(boards)
      .where(eq(boards.projectId, id));
    
    const maxPos = existingBoards.reduce((m, b) => Math.max(m, b.position), -1);

    const [newBoard] = await db
      .insert(boards)
      .values({
        projectId: id,
        title: title.trim(),
        position: maxPos + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newBoard, { status: 201 });
  } catch (error) {
    console.error('Error creating board:', error);
    return NextResponse.json({ message: 'Failed to create board' }, { status: 500 });
  }
}
