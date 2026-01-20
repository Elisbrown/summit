import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientProjects, projectMembers, users } from '@/lib/db/schema';
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

// GET /api/portal/projects/[projectId]/members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId } = await params;
    const pId = parseInt(projectId);

    if (isNaN(pId)) return NextResponse.json({ message: 'Invalid Project ID' }, { status: 400 });

    if (!await verifyClientAccess(pId, session.clientId)) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    // Fetch project members
    // We only expose necessary details (id, name, email, role)
    const members = await db
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
      .where(and(eq(projectMembers.projectId, pId), eq(users.softDelete, false)));

    return NextResponse.json(members);
  } catch (error) {
    console.error('Error fetching project members:', error);
    return NextResponse.json({ message: 'Failed to fetch members' }, { status: 500 });
  }
}
