import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, projectMembers, boards, clients, clientProjects, users } from '@/lib/db/schema';
import { and, eq, desc, asc, like, count } from 'drizzle-orm';
import { projectSchema } from '@/lib/validations/project';
import { withAuth } from '@/lib/auth/getAuthInfo';

// GET /api/projects - List all projects with pagination
export async function GET(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId, userId } = authInfo;
      const searchParams = request.nextUrl.searchParams;
      
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const status = searchParams.get('status');
      const search = searchParams.get('search') || '';
      const sortBy = searchParams.get('sortBy') || 'createdAt';
      const sortOrder = searchParams.get('sortOrder') || 'desc';
      
      const offset = (page - 1) * limit;
      
      // Base conditions
      let conditions = and(
        eq(projects.companyId, companyId),
        eq(projects.softDelete, false)
      );
      
      // Status filter
      if (status && status !== 'all') {
        if (['active', 'completed', 'paused', 'cancelled'].includes(status)) {
          conditions = and(
            conditions,
            eq(projects.status, status as 'active' | 'completed' | 'paused' | 'cancelled')
          );
        }
      }
      
      // Search filter
      if (search) {
        conditions = and(
          conditions,
          like(projects.title, `%${search}%`)
        );
      }
      
      // Count total
      const totalResult = await db
        .select({ count: count() })
        .from(projects)
        .where(conditions);
      
      const total = Number(totalResult[0]?.count || 0);
      
      // Fetch projects
      const projectList = await db
        .select()
        .from(projects)
        .where(conditions)
        .orderBy(
          sortOrder === 'asc'
            ? asc(projects[sortBy as keyof typeof projects] as any)
            : desc(projects[sortBy as keyof typeof projects] as any)
        )
        .limit(limit)
        .offset(offset);
      
      // For each project, get member count
      const projectsWithMeta = await Promise.all(
        projectList.map(async (project) => {
          const memberCount = await db
            .select({ count: count() })
            .from(projectMembers)
            .where(eq(projectMembers.projectId, project.id));
          
          return {
            ...project,
            memberCount: Number(memberCount[0]?.count || 0),
          };
        })
      );
      
      return NextResponse.json({
        data: projectsWithMeta,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { message: 'Failed to fetch projects' },
        { status: 500 }
      );
    }
  });
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { companyId, userId } = authInfo;
      const body = await request.json();
      
      // Validate
      const validation = projectSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { message: 'Validation failed', errors: validation.error.format() },
          { status: 400 }
        );
      }
      
      const { title, description, status, priority, startDate, endDate, colorCode, memberIds, clientId } = validation.data;
      
      // Verify client if provided
      if (clientId) {
        const [existingClient] = await db
          .select()
          .from(clients)
          .where(and(eq(clients.id, clientId), eq(clients.companyId, companyId), eq(clients.softDelete, false)));
        
        if (!existingClient) {
          return NextResponse.json({ message: 'Client not found' }, { status: 404 });
        }
      }
      
      // Create project (sequential operations for SQLite)
      // Insert project
      const [newProject] = await db
        .insert(projects)
        .values({
          companyId,
          title,
          description: description || null,
          status: status || 'active',
          priority: priority || 'medium',
          startDate: startDate ? startDate.toISOString().split('T')[0] : null,
          endDate: endDate ? endDate.toISOString().split('T')[0] : null,
          colorCode: colorCode || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          softDelete: false,
        })
        .returning();
      
      // Add creator as admin
      await db.insert(projectMembers).values({
        projectId: newProject.id,
        userId,
        role: 'admin',
        createdAt: new Date().toISOString(),
      });
      
      // Add additional members if provided
      if (memberIds && memberIds.length > 0) {
        // Verify users exist in company
        const validUsers = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.companyId, companyId), eq(users.softDelete, false)));
        
        const validUserIds = validUsers.map(u => u.id);
        
        for (const memberId of memberIds) {
          if (memberId !== userId && validUserIds.includes(memberId)) {
            await db.insert(projectMembers).values({
              projectId: newProject.id,
              userId: memberId,
              role: 'member',
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
      
      // Link client if provided
      if (clientId) {
        await db.insert(clientProjects).values({
          projectId: newProject.id,
          clientId,
          createdAt: new Date().toISOString(),
        });
      }
      
      // Create default boards
      const defaultBoards = ['To Do', 'In Progress', 'Done'];
      for (let i = 0; i < defaultBoards.length; i++) {
        await db.insert(boards).values({
          projectId: newProject.id,
          title: defaultBoards[i],
          position: i,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      
      const result = newProject;
      
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      console.error('Error creating project:', error);
      return NextResponse.json(
        { message: 'Failed to create project' },
        { status: 500 }
      );
    }
  });
}
