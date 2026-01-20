import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, clientProjects, projectMembers, users, boards, cards } from '@/lib/db/schema';
import { and, eq, desc, asc } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const { clientId } = session;
    const id = parseInt(projectId);

    if (isNaN(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

    // Verify Access
    const [access] = await db
      .select()
      .from(clientProjects)
      .where(and(eq(clientProjects.projectId, id), eq(clientProjects.clientId, clientId)));

    if (!access) {
      return NextResponse.json({ message: 'Project not found' }, { status: 404 });
    }

    // Fetch Project Details
    const [project] = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        priority: projects.priority,
        startDate: projects.startDate,
        endDate: projects.endDate,
        colorCode: projects.colorCode,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.id, id));

    // Fetch Members
    const membersList = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        user: {
          name: users.name,
          email: users.email,
        },
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, id));

    return NextResponse.json({
      ...project,
      members: membersList,
      currentUserRole: 'viewer', // Clients are effectively viewers/limited
    });

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ message: 'Failed to fetch project' }, { status: 500 });
  }
}
