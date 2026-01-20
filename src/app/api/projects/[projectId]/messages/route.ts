import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectMembers, projectMessages, projectFiles, users, clients } from '@/lib/db/schema';
import { and, eq, desc, asc, count } from 'drizzle-orm';
import { projectMessageSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { format } from 'date-fns';

// GET /api/projects/[projectId]/messages - List messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId } = authInfo;
      const id = parseInt(projectId);
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;
      
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
      
      // Check membership
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)));
      
      if (!membership && authInfo.role !== 'admin') {
        return NextResponse.json({ message: 'Not a member of this project' }, { status: 403 });
      }
      
      // Count total
      const [totalResult] = await db
        .select({ count: count() })
        .from(projectMessages)
        .where(and(eq(projectMessages.projectId, id), eq(projectMessages.softDelete, false)));
      
      // Get messages with user AND client info
      const messages = await db
        .select({
          id: projectMessages.id,
          content: projectMessages.content,
          createdAt: projectMessages.createdAt,
          userId: projectMessages.userId,
          clientId: projectMessages.clientId,
          replyToId: projectMessages.replyToId,
          user: {
            name: users.name,
            email: users.email,
          },
          client: {
            name: clients.name,
            email: clients.email,
          },
        })
        .from(projectMessages)
        .leftJoin(users, eq(projectMessages.userId, users.id))
        .leftJoin(clients, eq(projectMessages.clientId, clients.id))
        .where(and(eq(projectMessages.projectId, id), eq(projectMessages.softDelete, false)))
        .orderBy(desc(projectMessages.createdAt))
        .limit(limit)
        .offset(offset);
      
      // Get files for each message and format
      const messagesWithFiles = await Promise.all(
        messages.map(async (msg) => {
          const files = await db
            .select()
            .from(projectFiles)
            .where(eq(projectFiles.messageId, msg.id));
          
          // Get replyTo message if exists
          let replyTo = null;
          if (msg.replyToId) {
            const [parent] = await db
              .select({
                id: projectMessages.id,
                content: projectMessages.content,
                userId: projectMessages.userId,
                clientId: projectMessages.clientId,
                user: { name: users.name },
                client: { name: clients.name },
              })
              .from(projectMessages)
              .leftJoin(users, eq(projectMessages.userId, users.id))
              .leftJoin(clients, eq(projectMessages.clientId, clients.id))
              .where(eq(projectMessages.id, msg.replyToId));
            
            if (parent) {
              replyTo = {
                id: parent.id,
                content: parent.content,
                user: parent.userId ? parent.user : (parent.client ? { name: parent.client.name } : null),
              };
            }
          }

          // Unify user/client into single "user" object for frontend
          const unifiedUser = msg.userId 
            ? msg.user 
            : (msg.client ? { name: msg.client.name, email: msg.client.email } : { name: 'Unknown', email: '' });

          return { 
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            userId: msg.userId,
            clientId: msg.clientId,
            replyToId: msg.replyToId,
            user: unifiedUser,
            files, 
            replyTo 
          };
        })
      );
      
      return NextResponse.json({
        data: messagesWithFiles,
        total: Number(totalResult.count),
        page,
        limit,
        totalPages: Math.ceil(Number(totalResult.count) / limit),
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ message: 'Failed to fetch messages' }, { status: 500 });
    }
  });
}

// POST /api/projects/[projectId]/messages - Send message
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
      
      // Check membership (non-viewers can message)
      const [membership] = await db
        .select()
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId)));
      
      if (!membership && authInfo.role !== 'admin') {
        return NextResponse.json({ message: 'Not a member of this project' }, { status: 403 });
      }
      
      // Validate
      const validation = projectMessageSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      const { content, fileIds } = validation.data;
      

      const now = new Date();
      const timestamp = now.toISOString();
      
      // Create message (sequential operations for SQLite compatibility)
      const [newMessage] = await db
        .insert(projectMessages)
        .values({
          projectId: id,
          userId,
          content,
          replyToId: validation.data.replyToId || null,
          createdAt: timestamp,
          updatedAt: timestamp,
          softDelete: false,
        })
        .returning();
      
      // Link files if provided
      if (fileIds && fileIds.length > 0) {
        for (const fileId of fileIds) {
          await db
            .update(projectFiles)
            .set({ messageId: newMessage.id })
            .where(and(eq(projectFiles.id, fileId), eq(projectFiles.projectId, id)));
        }
      }
      
      const result = newMessage;
      
      // Get user info
      const [user] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, userId));
      
      return NextResponse.json({ ...result, user }, { status: 201 });
    } catch (error) {
      console.error('Error sending message:', error);
      return NextResponse.json({ message: 'Failed to send message' }, { status: 500 });
    }
  });
}
