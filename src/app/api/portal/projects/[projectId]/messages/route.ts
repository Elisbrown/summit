import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, clientProjects, projectMessages, clients, users } from '@/lib/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { getClientSession } from '@/lib/auth/client/utils';
import { z } from 'zod';
import { format } from 'date-fns';

const messageSchema = z.object({
  content: z.string().min(1),
  replyToId: z.number().optional(),
});

// GET Messages
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

    // Helper for recursion (replies) is tricky in one query.
    // For now, fetch flattened list with joins for user OR client.
    // We need to join properly. A message has userId OR clientId.
    // Drizzle doesn't support conditional joins easily. We'll join both and coalesce in code.
    
    const messages = await db
      .select({
        id: projectMessages.id,
        content: projectMessages.content,
        createdAt: projectMessages.createdAt,
        userId: projectMessages.userId,
        clientId: projectMessages.clientId,
        userName: users.name,
        userEmail: users.email,
        clientName: clients.name,
        clientEmail: clients.email,
        replyToId: projectMessages.replyToId,
      })
      .from(projectMessages)
      .leftJoin(users, eq(projectMessages.userId, users.id))
      .leftJoin(clients, eq(projectMessages.clientId, clients.id))
      .where(and(eq(projectMessages.projectId, id), eq(projectMessages.softDelete, false)))
      .orderBy(desc(projectMessages.createdAt))
      .limit(100);

    // Build a map for reply lookups
    const messageMap = new Map(messages.map(m => [m.id, m]));

    // Transform for UI
    const formatted = messages.map(msg => {
        const replyMessage = msg.replyToId ? messageMap.get(msg.replyToId) : null;
        return {
            id: msg.id,
            content: msg.content,
            createdAt: msg.createdAt,
            userId: msg.userId,
            clientId: msg.clientId,
            user: msg.userId 
              ? { name: msg.userName, email: msg.userEmail || '' } 
              : (msg.clientName ? { name: msg.clientName, email: msg.clientEmail || '' } : null),
            replyToId: msg.replyToId,
            replyTo: replyMessage ? {
                id: replyMessage.id,
                content: replyMessage.content,
                user: replyMessage.userId 
                  ? { name: replyMessage.userName, email: replyMessage.userEmail || '' } 
                  : (replyMessage.clientName ? { name: replyMessage.clientName, email: replyMessage.clientEmail || '' } : null)
            } : null
        };
    });

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ message: 'Failed to fetch messages' }, { status: 500 });
  }
}

// POST Message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getClientSession();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { projectId } = await params;
    const id = parseInt(projectId);
    const body = await request.json();

    // Verify Access
    const [access] = await db
      .select()
      .from(clientProjects)
      .where(and(eq(clientProjects.projectId, id), eq(clientProjects.clientId, session.clientId)));

    if (!access) return NextResponse.json({ message: 'Access denied' }, { status: 403 });

    const validation = messageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid content' }, { status: 400 });
    }

    const { content, replyToId } = validation.data;

    const now = new Date();
    const timestamp = format(now, 'yyyy-MM-dd HH:mm:ss');

    const [newMessage] = await db.insert(projectMessages).values({
      projectId: id,
      clientId: session.clientId, // Set client ID
      content,
      replyToId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).returning();

    // Fetch full details for response, including replyTo if exists
    const [msg] = await db
      .select({
        id: projectMessages.id,
        content: projectMessages.content,
        createdAt: projectMessages.createdAt,
        userId: projectMessages.userId,
        clientId: projectMessages.clientId,
        replyToId: projectMessages.replyToId,
        client: {
             name: clients.name,
             email: clients.email,
        }
      })
      .from(projectMessages)
      .innerJoin(clients, eq(projectMessages.clientId, clients.id))
      .where(eq(projectMessages.id, newMessage.id));
    
    // If there's a replyTo, fetch that message info
    let replyTo = null;
    if (msg.replyToId) {
      const [parentMsg] = await db
        .select({
          id: projectMessages.id,
          content: projectMessages.content,
          userId: projectMessages.userId,
          clientId: projectMessages.clientId,
        })
        .from(projectMessages)
        .where(eq(projectMessages.id, msg.replyToId));
      
      if (parentMsg) {
        // Get user info for the reply
        let userName = 'Unknown';
        if (parentMsg.userId) {
          const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, parentMsg.userId));
          userName = u?.name || 'Unknown';
        } else if (parentMsg.clientId) {
          const [c] = await db.select({ name: clients.name }).from(clients).where(eq(clients.id, parentMsg.clientId));
          userName = c?.name || 'Unknown';
        }
        replyTo = {
          id: parentMsg.id,
          content: parentMsg.content,
          user: { name: userName },
        };
      }
    }
      
    const formatted = {
        ...msg,
        user: { name: msg.client.name, email: msg.client.email }, // Format as user
        replyTo,
    };

    return NextResponse.json(formatted);

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ message: 'Failed to send message' }, { status: 500 });
  }
}
