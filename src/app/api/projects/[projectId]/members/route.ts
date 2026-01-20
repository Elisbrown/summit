import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectMembers, users } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { projectMemberSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/projects/[projectId]/members - List members
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
      
      // Verify project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Get members
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
      
      return NextResponse.json({ data: members });
    } catch (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ message: 'Failed to fetch members' }, { status: 500 });
    }
  });
}

// POST /api/projects/[projectId]/members - Add member
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
      
      // Verify project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check if current user is admin
      const [adminMembership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId), eq(projectMembers.role, 'admin')));
      
      if (!adminMembership) {
        return NextResponse.json({ message: 'Only admins can add members' }, { status: 403 });
      }
      
      // Validate
      const validation = projectMemberSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      const { userId: newUserId, role } = validation.data;
      
      // Verify user exists in company
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, newUserId), eq(users.companyId, companyId), eq(users.softDelete, false)));
      
      if (!user) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }
      
      // Check if already a member
      const [existing] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, newUserId)));
      
      if (existing) {
        return NextResponse.json({ message: 'User is already a member' }, { status: 400 });
      }
      
      // Add member
      const [newMember] = await db
        .insert(projectMembers)
        .values({
          projectId: id,
          userId: newUserId,
          role: role || 'member',
          createdAt: new Date().toISOString(),
        })
        .returning();
      
      return NextResponse.json(newMember, { status: 201 });
    } catch (error) {
      console.error('Error adding member:', error);
      return NextResponse.json({ message: 'Failed to add member' }, { status: 500 });
    }
  });
}

// PUT /api/projects/[projectId]/members - Update member role
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
      
      const { memberId, role } = body;
      
      if (!memberId || !role) {
        return NextResponse.json({ message: 'Member ID and role are required' }, { status: 400 });
      }
      
      // Verify project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check if current user is admin
      const [adminMembership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId), eq(projectMembers.role, 'admin')));
      
      if (!adminMembership) {
        return NextResponse.json({ message: 'Only admins can update members' }, { status: 403 });
      }
      
      // Update member
      await db
        .update(projectMembers)
        .set({ role })
        .where(eq(projectMembers.id, memberId));
      
      return NextResponse.json({ message: 'Member role updated' });
    } catch (error) {
      console.error('Error updating member:', error);
      return NextResponse.json({ message: 'Failed to update member' }, { status: 500 });
    }
  });
}

// DELETE /api/projects/[projectId]/members - Remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId } = authInfo;
      const id = parseInt(projectId);
      
      let memberId: number | undefined;
      let memberUserId: number | undefined;
      
      // Try getting from body first (for memberId)
      try {
        const body = await request.json();
        if (body.memberId) memberId = body.memberId;
        if (body.userId) memberUserId = body.userId;
      } catch (e) {
        // Body might be empty
      }
      
      // Try query params if not in body
      if (!memberId && !memberUserId) {
        const searchParams = request.nextUrl.searchParams;
         if (searchParams.has('userId')) memberUserId = parseInt(searchParams.get('userId') || '');
         if (searchParams.has('memberId')) memberId = parseInt(searchParams.get('memberId') || '');
      }
      
      if (isNaN(id) || (!memberId && !memberUserId)) {
        return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
      }
      
      // Verify project
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, id), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
      
      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }
      
      // Check if current user is admin
      const [adminMembership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId), eq(projectMembers.role, 'admin')));
      
      if (!adminMembership) {
        return NextResponse.json({ message: 'Only admins can remove members' }, { status: 403 });
      }

      // Check permissions and get user id if we only have memberId
      let targetUserId = memberUserId;
      if (memberId) {
        const [targetMember] = await db
          .select()
          .from(projectMembers)
          .where(eq(projectMembers.id, memberId));
          
        if (targetMember) {
          targetUserId = targetMember.userId;
        }
      }
      
      // Prevent removing last admin
      if (targetUserId === userId) {
        const adminCount = await db
          .select()
          .from(projectMembers)
          .where(and(eq(projectMembers.projectId, id), eq(projectMembers.role, 'admin')));
        
        if (adminCount.length <= 1) {
          return NextResponse.json({ message: 'Cannot remove the last admin' }, { status: 400 });
        }
      }
      
      // Remove member
      if (memberId) {
        await db
          .delete(projectMembers)
          .where(eq(projectMembers.id, memberId));
      } else if (memberUserId) {
        await db
          .delete(projectMembers)
          .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, memberUserId)));
      }
      
      return NextResponse.json({ message: 'Member removed' });
    } catch (error) {
      console.error('Error removing member:', error);
      return NextResponse.json({ message: 'Failed to remove member' }, { status: 500 });
    }
  });
}
