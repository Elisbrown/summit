import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectFiles, projects, projectMembers } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// GET /api/projects/[projectId]/files - List files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId, role } = authInfo;
      const id = parseInt(projectId);

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
      }

      // Check project access (similar to other endpoints)
      const project = await db.query.projects.findFirst({
        where: and(
            eq(projects.id, id),
            eq(projects.companyId, companyId),
            eq(projects.softDelete, false)
        )
      });

      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }

      // Check membership if not admin
      if (role !== 'admin') {
         const member = await db.query.projectMembers.findFirst({
            where: and(
                eq(projectMembers.projectId, id),
                eq(projectMembers.userId, userId)
            )
         });
         if (!member) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
         }
      }

      const files = await db.query.projectFiles.findMany({
        where: eq(projectFiles.projectId, id),
        orderBy: [desc(projectFiles.createdAt)],
        with: {
            uploadedBy: {
                columns: {
                    id: true,
                    name: true,
                }
            }
        }
      });

      return NextResponse.json(files);

    } catch (error) {
      console.error('Error fetching project files:', error);
      return NextResponse.json({ message: 'Failed to fetch files' }, { status: 500 });
    }
  });
}

// POST /api/projects/[projectId]/files - Upload file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId, role } = authInfo;
      const id = parseInt(projectId);

      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid project ID' }, { status: 400 });
      }

      // Permission check
      const project = await db.query.projects.findFirst({
        where: and(
            eq(projects.id, id),
            eq(projects.companyId, companyId),
            eq(projects.softDelete, false)
        )
      });

      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }

      // Check membership (must be admin or member, maybe viewer shouldn't upload?)
      let canUpload = role === 'admin';
      if (!canUpload) {
         const member = await db.query.projectMembers.findFirst({
            where: and(
                eq(projectMembers.projectId, id),
                eq(projectMembers.userId, userId)
            )
         });
         // Don't allow viewers to upload? Assuming members can.
         if (member && member.role !== 'viewer') {
            canUpload = true;
         }
      }

      if (!canUpload) {
         return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }

      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ message: 'No file provided' }, { status: 400 });
      }

      // Validate file size/type if needed
      // const maxBytes = 10 * 1024 * 1024; // 10MB
      // if (file.size > maxBytes) ...

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

      const [newFile] = await db.insert(projectFiles).values({
        projectId: id,
        uploadedById: userId,
        name: file.name,
        url: fileUrl,
        mimeType: file.type,
        size: file.size,
        createdAt: new Date().toISOString()
      }).returning();

      // Return file with uploadedBy info for UI
      return NextResponse.json({
        ...newFile,
        uploadedBy: {
            id: userId,
            name: 'Unknown' // Ideally get from session or query
        }
      }, { status: 201 });

    } catch (error) {
      console.error('Error uploading file:', error);
      return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
    }
  });
}
