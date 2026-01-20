import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectMembers, boards } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { boardSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// PUT /api/projects/[projectId]/boards/[boardId] - Update board
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; boardId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId, boardId } = await params;
      const { companyId, userId } = authInfo;
      const pId = parseInt(projectId);
      const bId = parseInt(boardId);
      const body = await request.json();
      
      if (isNaN(pId) || isNaN(bId)) {
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
      
      // Check permissions
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, pId), eq(projectMembers.userId, userId)));
      
      if (!membership || membership.role === 'viewer') {
        return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
      }
      
      // Verify board exists
      const [board] = await db
        .select()
        .from(boards)
        .where(and(eq(boards.id, bId), eq(boards.projectId, pId)));
      
      if (!board) {
        return NextResponse.json({ message: 'Board not found' }, { status: 404 });
      }
      
      // Validate
      const validation = boardSchema.partial().safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      // Update
      const [updated] = await db
        .update(boards)
        .set({
          ...(validation.data.title !== undefined && { title: validation.data.title }),
          ...(validation.data.position !== undefined && { position: validation.data.position }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(boards.id, bId))
        .returning();
      
      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error updating board:', error);
      return NextResponse.json({ message: 'Failed to update board' }, { status: 500 });
    }
  });
}

// DELETE /api/projects/[projectId]/boards/[boardId] - Delete board
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; boardId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId, boardId } = await params;
      const { companyId, userId } = authInfo;
      const pId = parseInt(projectId);
      const bId = parseInt(boardId);
      
      if (isNaN(pId) || isNaN(bId)) {
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
      
      // Check admin permission
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, pId), eq(projectMembers.userId, userId), eq(projectMembers.role, 'admin')));
      
      if (!membership) {
        return NextResponse.json({ message: 'Only admins can delete boards' }, { status: 403 });
      }
      
      // Verify board exists
      const [board] = await db
        .select()
        .from(boards)
        .where(and(eq(boards.id, bId), eq(boards.projectId, pId)));
      
      if (!board) {
        return NextResponse.json({ message: 'Board not found' }, { status: 404 });
      }
      
      // Delete board (cascades cards via FK)
      await db.delete(boards).where(eq(boards.id, bId));
      
      return NextResponse.json({ message: 'Board deleted' });
    } catch (error) {
      console.error('Error deleting board:', error);
      return NextResponse.json({ message: 'Failed to delete board' }, { status: 500 });
    }
  });
}
