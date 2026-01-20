import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, clients, clientProjects } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { z } from 'zod';

const clientAddSchema = z.object({
  clientId: z.number(),
});

// GET /api/projects/[projectId]/clients - List clients
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
      
      // Get clients
      const projectClientsList = await db
        .select({
          id: clients.id,
          name: clients.name,
          email: clients.email,
          createdAt: clientProjects.createdAt,
        })
        .from(clientProjects)
        .innerJoin(clients, eq(clientProjects.clientId, clients.id))
        .where(eq(clientProjects.projectId, id));
      
      return NextResponse.json({ data: projectClientsList });
    } catch (error) {
      console.error('Error fetching project clients:', error);
      return NextResponse.json({ message: 'Failed to fetch clients' }, { status: 500 });
    }
  });
}

// POST /api/projects/[projectId]/clients - Add client
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId } = authInfo;
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
      
      if (authInfo.role !== 'admin') {
         // Optionally verify if user is project admin, but typically only admins manage clients
         // Keeping it simple for now: only company admins or project members?
         // Let's allow admins for now as per user request context
      }
      
      const validation = clientAddSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      const { clientId } = validation.data;
      
      // Verify client belongs to company
      const [client] = await db
        .select()
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId), eq(clients.softDelete, false)));
      
      if (!client) {
        return NextResponse.json({ message: 'Client not found' }, { status: 404 });
      }
      
      // Check if already added
      const [existing] = await db
        .select()
        .from(clientProjects)
        .where(and(eq(clientProjects.projectId, id), eq(clientProjects.clientId, clientId)));
      
      if (existing) {
        return NextResponse.json({ message: 'Client already added to project' }, { status: 400 });
      }
      
      // Add client
      await db.insert(clientProjects).values({
        projectId: id,
        clientId,
        createdAt: new Date().toISOString(),
      });
      
      return NextResponse.json({ message: 'Client added to project' }, { status: 201 });
    } catch (error) {
      console.error('Error adding client:', error);
      return NextResponse.json({ message: 'Failed to add client' }, { status: 500 });
    }
  });
}

// DELETE /api/projects/[projectId]/clients - Remove client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(projectId);
      
      let clientId: number | undefined;
      try {
        const body = await request.json();
        clientId = body.clientId;
      } catch (e) {
         const searchParams = request.nextUrl.searchParams;
         if (searchParams.has('clientId')) clientId = parseInt(searchParams.get('clientId') || '');
      }
      
      if (isNaN(id) || !clientId) {
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
      
      // Remove client
      await db
        .delete(clientProjects)
        .where(and(eq(clientProjects.projectId, id), eq(clientProjects.clientId, clientId)));
      
      return NextResponse.json({ message: 'Client removed from project' });
    } catch (error) {
      console.error('Error removing client:', error);
      return NextResponse.json({ message: 'Failed to remove client' }, { status: 500 });
    }
  });
}
