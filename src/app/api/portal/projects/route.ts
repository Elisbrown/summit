import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, clientProjects, clients } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';

// GET /api/portal/projects - List projects for the authenticated client
export async function GET(request: NextRequest) {
  try {
    const session = await getClientSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { clientId } = session;

    // Fetch projects linked to this client
    const clientProjectsList = await db
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
      .innerJoin(clientProjects, eq(clientProjects.projectId, projects.id))
      .where(and(
        eq(clientProjects.clientId, clientId),
        eq(projects.softDelete, false)
      ))
      .orderBy(desc(projects.updatedAt));

    return NextResponse.json({ data: clientProjectsList });
  } catch (error) {
    console.error('Error fetching client projects:', error);
    return NextResponse.json({ message: 'Failed to fetch projects' }, { status: 500 });
  }
}
