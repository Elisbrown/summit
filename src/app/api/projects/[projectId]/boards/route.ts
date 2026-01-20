import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectMembers, boards, cards } from '@/lib/db/schema';
import { and, eq, asc } from 'drizzle-orm';
import { boardSchema, boardReorderSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/projects/[projectId]/boards - List boards with cards
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId } = authInfo;
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
      
      // Get boards
      const boardList = await db
        .select()
        .from(boards)
        .where(eq(boards.projectId, id))
        .orderBy(asc(boards.position));
      
      // Get cards for each board
      const boardsWithCards = await Promise.all(
        boardList.map(async (board) => {
          const boardCards = await db
            .select()
            .from(cards)
            .where(and(eq(cards.boardId, board.id), eq(cards.softDelete, false)))
            .orderBy(asc(cards.position));
          
          return { ...board, cards: boardCards };
        })
      );
      
      return NextResponse.json({ data: boardsWithCards });
    } catch (error) {
      console.error('Error fetching boards:', error);
      return NextResponse.json({ message: 'Failed to fetch boards' }, { status: 500 });
    }
  });
}

// POST /api/projects/[projectId]/boards - Create board
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId } = authInfo;
      const id = parseInt(projectId);
      const body = await request.json();
      
      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
      }
      
      // Verify project and membership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)));
      
      const isCompanyAdmin = authInfo.role === 'admin';
      
      if ((!membership || membership.role === 'viewer') && !isCompanyAdmin) {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Validate
      const validation = boardSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      // Get max position
      const existingBoards = await db
        .select()
        .from(boards)
        .where(eq(boards.projectId, id))
        .orderBy(asc(boards.position));
      
      const maxPosition = existingBoards.length > 0 
        ? Math.max(...existingBoards.map(b => b.position)) + 1 
        : 0;
      
      // Create board
      const [newBoard] = await db
        .insert(boards)
        .values({
          projectId: id,
          title: validation.data.title,
          position: validation.data.position ?? maxPosition,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .returning();
      
      return NextResponse.json(newBoard, { status: 201 });
    } catch (error) {
      console.error('Error creating board:', error);
      return NextResponse.json({ message: 'Failed to create board' }, { status: 500 });
    }
  });
}

// PUT /api/projects/[projectId]/boards - Reorder boards (batch)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId } = authInfo;
      const id = parseInt(projectId);
      const body = await request.json();
      
      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
      }
      
      // Verify project and membership
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)));
      
      const isCompanyAdmin = authInfo.role === 'admin';
      
      if ((!membership || membership.role === 'viewer') && !isCompanyAdmin) {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Validate
      const validation = boardReorderSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      // Update positions (sequential for SQLite)
      for (const item of validation.data.boards) {
        await db
          .update(boards)
          .set({ position: item.position, updatedAt: new Date().toISOString() })
          .where(and(eq(boards.id, item.id), eq(boards.projectId, id)));
      }
      
      return NextResponse.json({ message: 'Boards reordered' });
    } catch (error) {
      console.error('Error reordering boards:', error);
      return NextResponse.json({ message: 'Failed to reorder boards' }, { status: 500 });
    }
  });
}
