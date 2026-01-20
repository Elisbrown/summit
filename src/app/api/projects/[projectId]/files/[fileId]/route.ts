import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projectFiles, projects } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { unlink } from 'fs/promises';
import path from 'path';

// DELETE /api/projects/[projectId]/files/[fileId] - Delete file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; fileId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId, fileId } = await params;
      const { companyId, userId, role } = authInfo;
      const pId = parseInt(projectId);
      const fId = parseInt(fileId);

      if (isNaN(pId) || isNaN(fId)) {
        return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });
      }

      // Check project access first
      const project = await db.query.projects.findFirst({
        where: and(
            eq(projects.id, pId),
            eq(projects.companyId, companyId)
        )
      });

      if (!project) {
        return NextResponse.json({ message: 'Project not found' }, { status: 404 });
      }

      // Find file
      const file = await db.query.projectFiles.findFirst({
        where: and(
            eq(projectFiles.id, fId),
            eq(projectFiles.projectId, pId)
        )
      });

      if (!file) {
        return NextResponse.json({ message: 'File not found' }, { status: 404 });
      }

      // Check delete permission: Admin or the one who uploaded it
      const isUploader = file.uploadedById === userId;
      const isAdmin = role === 'admin';

      if (!isUploader && !isAdmin) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }

      // Delete from disk
      try {
          // Construct absolute path from relative URL
          // URL is like /uploads/projects/1/123-file.png
          // We need to remove leading slash
          const relativePath = file.url.startsWith('/') ? file.url.slice(1) : file.url;
          const absolutePath = path.join(process.cwd(), 'public', relativePath);
          await unlink(absolutePath);
      } catch (err) {
          console.error('Error deleting file from disk:', err);
          // Continue to delete from DB even if disk delete fails (orphaned file is better than broken UI)
      }

      // Delete from DB
      await db.delete(projectFiles).where(eq(projectFiles.id, fId));

      return NextResponse.json({ message: 'File deleted successfully' });

    } catch (error) {
      console.error('Error deleting file:', error);
      return NextResponse.json({ message: 'Failed to delete file' }, { status: 500 });
    }
  });
}
