import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, clientProjects, projectFiles, users, clients } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

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

// POST /api/portal/projects/[projectId]/files - Upload file (client)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const id = parseInt(projectId);

    if (isNaN(id)) {
      return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
    }

    // Verify client has access to project
    const [access] = await db
      .select()
      .from(clientProjects)
      .where(and(eq(clientProjects.projectId, id), eq(clientProjects.clientId, session.clientId)));

    if (!access) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    // Validate file size (100MB limit)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        message: `File size exceeds the 100MB limit. Your file is ${Math.round(file.size / 1024 / 1024)}MB.` 
      }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${sanitizedName}`;
    
    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'projects', projectId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/projects/${projectId}/${fileName}`;

    // Get client name for response
    const [clientData] = await db
      .select({ name: clients.name })
      .from(clients)
      .where(eq(clients.id, session.clientId));

    const [newFile] = await db.insert(projectFiles).values({
      projectId: id,
      uploadedByClientId: session.clientId,
      name: file.name,
      url: fileUrl,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date().toISOString()
    }).returning();

    return NextResponse.json({
      ...newFile,
      uploadedBy: clientData?.name || 'Client'
    }, { status: 201 });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
  }
}
