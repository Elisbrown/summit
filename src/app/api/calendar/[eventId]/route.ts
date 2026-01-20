import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calendarEvents } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { calendarEventSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/calendar/[eventId] - Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { eventId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(eventId);
      
      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
      }
      
      const [event] = await db
        .select()
        .from(calendarEvents)
        .where(and(eq(calendarEvents.id, id), eq(calendarEvents.companyId, companyId), eq(calendarEvents.softDelete, false)));
      
      if (!event) {
        return NextResponse.json({ message: 'Event not found' }, { status: 404 });
      }
      
      return NextResponse.json(event);
    } catch (error) {
      console.error('Error fetching event:', error);
      return NextResponse.json({ message: 'Failed to fetch event' }, { status: 500 });
    }
  });
}

// PUT /api/calendar/[eventId] - Update event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { eventId } = await params;
      const { companyId, userId } = authInfo;
      const id = parseInt(eventId);
      const body = await request.json();
      
      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
      }
      
      // Get event
      const [event] = await db
        .select()
        .from(calendarEvents)
        .where(and(eq(calendarEvents.id, id), eq(calendarEvents.companyId, companyId), eq(calendarEvents.softDelete, false)));
      
      if (!event) {
        return NextResponse.json({ message: 'Event not found' }, { status: 404 });
      }
      
      // Validate
      const validation = calendarEventSchema.partial().safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      const { title, description, type, allDay, startAt, endAt, projectId } = validation.data;
      
      // Update
      const [updated] = await db
        .update(calendarEvents)
        .set({
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(type !== undefined && { type }),
          ...(allDay !== undefined && { allDay }),
          ...(startAt !== undefined && { startAt: startAt.toISOString() }),
          ...(endAt !== undefined && { endAt: endAt ? endAt.toISOString() : null }),
          ...(projectId !== undefined && { projectId }),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(calendarEvents.id, id))
        .returning();
      
      return NextResponse.json(updated);
    } catch (error) {
      console.error('Error updating event:', error);
      return NextResponse.json({ message: 'Failed to update event' }, { status: 500 });
    }
  });
}

// DELETE /api/calendar/[eventId] - Soft delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { eventId } = await params;
      const { companyId } = authInfo;
      const id = parseInt(eventId);
      
      if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
      }
      
      // Get event
      const [event] = await db
        .select()
        .from(calendarEvents)
        .where(and(eq(calendarEvents.id, id), eq(calendarEvents.companyId, companyId), eq(calendarEvents.softDelete, false)));
      
      if (!event) {
        return NextResponse.json({ message: 'Event not found' }, { status: 404 });
      }
      
      // Soft delete
      await db
        .update(calendarEvents)
        .set({ softDelete: true, updatedAt: new Date().toISOString() })
        .where(eq(calendarEvents.id, id));
      
      return NextResponse.json({ message: 'Event deleted' });
    } catch (error) {
      console.error('Error deleting event:', error);
      return NextResponse.json({ message: 'Failed to delete event' }, { status: 500 });
    }
  });
}
