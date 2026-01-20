import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calendarEvents, projects, cards, boards } from '@/lib/db/schema';
import { and, eq, gte, lte, or, desc, count } from 'drizzle-orm';
import { calendarEventSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/calendar - List calendar events and card due dates
export async function GET(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId, userId } = authInfo;
      const searchParams = request.nextUrl.searchParams;
      
      const startDate = searchParams.get('start');
      const endDate = searchParams.get('end');
      const projectId = searchParams.get('projectId');
      
      // Build conditions
      let conditions = and(
        eq(calendarEvents.companyId, companyId),
        eq(calendarEvents.softDelete, false)
      );
      
      // Date range filter
      if (startDate) {
        // Ensure we compare with ISO strings
        conditions = and(conditions, gte(calendarEvents.startAt, new Date(startDate).toISOString()));
      }
      if (endDate) {
        conditions = and(conditions, lte(calendarEvents.startAt, new Date(endDate).toISOString()));
      }
      
      // Project filter
      if (projectId) {
        conditions = and(conditions, eq(calendarEvents.projectId, parseInt(projectId)));
      }
      
      // Get calendar events
      const events = await db
        .select()
        .from(calendarEvents)
        .where(conditions)
        .orderBy(calendarEvents.startAt);
      
      // Also get card due dates as events (if date range provided)
      let cardEvents: any[] = [];
      if (startDate && endDate) {
        // Get all projects for company
        const companyProjects = await db
          .select({ id: projects.id, title: projects.title, colorCode: projects.colorCode })
          .from(projects)
          .where(and(eq(projects.companyId, companyId), eq(projects.softDelete, false)));
        
        const projectIds = companyProjects.map(p => p.id);
        
        if (projectIds.length > 0) {
          // Get boards for these projects
          const projectBoards = await db
            .select()
            .from(boards)
            .where(or(...projectIds.map(pId => eq(boards.projectId, pId))));
          
          const boardIds = projectBoards.map(b => b.id);
          
          if (boardIds.length > 0) {
            // Get cards with due dates in range
            const cardsWithDueDates = await db
              .select()
              .from(cards)
              .where(and(
                or(...boardIds.map(bId => eq(cards.boardId, bId))),
                eq(cards.softDelete, false),
                gte(cards.dueDate, new Date(startDate).toISOString()),
                lte(cards.dueDate, new Date(endDate).toISOString())
              ));
            
            // Map cards to event-like objects
            cardEvents = cardsWithDueDates.map(card => {
              const board = projectBoards.find(b => b.id === card.boardId);
              const project = companyProjects.find(p => p.id === board?.projectId);
              
              return {
                id: `card-${card.id}`,
                title: card.title,
                type: 'task',
                allDay: true,
                startAt: card.dueDate,
                endAt: card.dueDate,
                projectId: project?.id,
                projectTitle: project?.title,
                colorCode: project?.colorCode,
                isCardDueDate: true,
                cardId: card.id,
                boardId: card.boardId,
              };
            });
          }
        }
      }
      
      return NextResponse.json({
        events,
        cardDueDates: cardEvents,
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return NextResponse.json({ message: 'Failed to fetch events' }, { status: 500 });
    }
  });
}

// POST /api/calendar - Create calendar event
export async function POST(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId, userId } = authInfo;
      const body = await request.json();
      
      // Validate
      const validation = calendarEventSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Validation failed', errors: validation.error.format() }, { status: 400 });
      }
      
      const { title, description, type, allDay, startAt, endAt, projectId } = validation.data;
      
      // If projectId provided, verify it exists
      if (projectId) {
        const [project] = await db
          .select()
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
        
        if (!project) {
          return NextResponse.json({ message: 'Project not found' }, { status: 404 });
        }
      }
      
      // Create event
      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          companyId,
          userId,
          projectId: projectId || null,
          title,
          description: description || null,
          type: type || 'event',
          allDay: allDay || false,
          startAt: startAt.toISOString(), // Convert Date object to ISO string
          endAt: endAt ? endAt.toISOString() : null, // Convert Date object to ISO string
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          softDelete: false,
        })
        .returning();
      
      return NextResponse.json(newEvent, { status: 201 });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return NextResponse.json({ message: 'Failed to create event' }, { status: 500 });
    }
  });
}
