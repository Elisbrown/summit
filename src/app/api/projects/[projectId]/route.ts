import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectMembers, boards, cards, clientProjects, clients, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { projectSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/projects/[projectId] - Get project details
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
      
      // Get project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, id),
          eq(projects.companyId, companyId),
          eq(projects.softDelete, false)
        ));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check membership (or admin access)
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, userId)
        ));
      
      // Get members with user info
      const members = await db
        .select({
          id: projectMembers.id,
          userId: projectMembers.userId,
          role: projectMembers.role,
          createdAt: projectMembers.createdAt,
          user: {
            name: users.name,
            email: users.email,
          },
        })
        .from(projectMembers)
        .leftJoin(users, eq(projectMembers.userId, users.id))
        .where(eq(projectMembers.projectId, id));
      
      // Get boards with cards
      const projectBoards = await db
        .select()
        .from(boards)
        .where(eq(boards.projectId, id))
        .orderBy(boards.position);
      
      const boardsWithCards = await Promise.all(
        projectBoards.map(async (board) => {
          const boardCards = await db
            .select()
            .from(cards)
            .where(and(eq(cards.boardId, board.id), eq(cards.softDelete, false)))
            .orderBy(cards.position);
          
          return { ...board, cards: boardCards };
        })
      );
      
      // Get linked clients
      const linkedClients = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
        })
        .from(clientProjects)
        .leftJoin(clients, eq(clientProjects.clientId, clients.id))
        .where(eq(clientProjects.projectId, id));
      
      return NextResponse.json({
        ...project,
        members,
        boards: boardsWithCards,
        clients: linkedClients,
        currentUserRole: membership?.role || null,
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      return NextResponse.json({ message: 'Failed to fetch project' }, { status: 500 });
    }
  });
}

// PUT /api/projects/[projectId] - Update project
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
      
      // Get project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, id),
          eq(projects.companyId, companyId),
          eq(projects.softDelete, false)
        ));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check if user is admin
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, userId),
          eq(projectMembers.role, 'admin')
        ));
      
      const isCompanyAdmin = authInfo.role === 'admin';
      
      if (!membership && !isCompanyAdmin) {
        return NextResponse.json({ message: 'Only admins can update the project' }, { status: 403 });
      }
      
      // Validate
      const validation = projectSchema.partial().safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }
      
      const { title, description, status, priority, startDate, endDate, colorCode } = validation.data;
      
      // Update
      const [updated] = await db
        .update(projects)
        .set({
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(status !== undefined && { status }),
          ...(priority !== undefined && { priority }),
          ...(startDate !== undefined && { startDate: startDate ? startDate.toISOString().split('T')[0] : null }),
          ...(endDate !== undefined && { endDate: endDate ? endDate.toISOString().split('T')[0] : null }),
          ...(colorCode !== undefined && { colorCode }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(projects.id, id))
        .returning();
      
      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error updating project:', error);
      return NextResponse.json({ message: 'Failed to update project' }, { status: 500 });
    }
  });
}

// DELETE /api/projects/[projectId] - Soft delete project
export async function DELETE(
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
      
      // Get project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.id, id),
          eq(projects.companyId, companyId),
          eq(projects.softDelete, false)
        ));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check if user is admin
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, userId),
          eq(projectMembers.role, 'admin')
        ));
      
      if (!membership) {
        return NextResponse.json({ message: 'Only admins can delete the project' }, { status: 403 });
      }
      
      // Soft delete
      await db
        .update(projects)
        .set({ softDelete: true, updatedAt: new Date().toISOString() })
        .where(eq(projects.id, id));
      
      return NextResponse.json({ message: 'Project deleted' });
    } catch (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json({ message: 'Failed to delete project' }, { status: 500 });
    }
  });
}
