import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, clientProjects, projectFiles, users, clients } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
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

    // Fetch Files
    const files = await db
      .select({
        id: projectFiles.id,
        name: projectFiles.name,
        url: projectFiles.url,
        mimeType: projectFiles.mimeType,
        size: projectFiles.size,
        createdAt: projectFiles.createdAt,
        uploadedByUser: {
           name: users.name,
        },
        uploadedByClient: {
           name: clients.name,
        }
      })
      .from(projectFiles)
      .leftJoin(users, eq(projectFiles.uploadedById, users.id))
      .leftJoin(clients, eq(projectFiles.uploadedByClientId, clients.id))
      .where(eq(projectFiles.projectId, id))
      .orderBy(desc(projectFiles.createdAt));

    const formatted = files.map(f => ({
        ...f,
        uploadedBy: f.uploadedByUser?.name || f.uploadedByClient?.name || 'Unknown',
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json({ message: 'Failed to fetch files' }, { status: 500 });
  }
}
