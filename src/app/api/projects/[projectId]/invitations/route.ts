import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { projects, companyInvitations, users, projectMembers } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { withAuth } from '@/lib/auth/getAuthInfo';
import { z } from 'zod';
import { sendEmail, getInvitationEmailHtml } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

// POST /api/projects/[projectId]/invitations - Send invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  return withAuth<any>(request, async (authInfo) => {
    try {
      const { projectId } = await params;
      const { companyId, userId } = authInfo;
      const inviterName = (authInfo as any).name || 'Team member';
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
      
      // Check permissions (admin or project admin)
      if (authInfo.role !== 'admin') {
         const [membership] = await db
          .select()
          .from(projectMembers)
          .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, userId), eq(projectMembers.role, 'admin')));
         
         if (!membership) {
           return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 });
         }
      }
      
      const validation = inviteSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({ message: 'Invalid email or role' }, { status: 400 });
      }
      
      const { email, role } = validation.data;
      
      // Check if user already exists in company
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.companyId, companyId), eq(users.softDelete, false)));
      
      if (existingUser) {
        // If user exists, check membership
        const [existingMember] = await db
          .select()
          .from(projectMembers)
          .where(and(eq(projectMembers.projectId, id), eq(projectMembers.userId, existingUser.id)));
        
        if (existingMember) {
          return NextResponse.json({ message: 'User is already a member' }, { status: 400 });
        }
        
        // Add existing user directly
        await db.insert(projectMembers).values({
          projectId: id,
          userId: existingUser.id,
          role,
          createdAt: new Date().toISOString(),
        });
        
        // Notify (optional)
        await sendEmail({
          to: email,
          subject: `You've been added to ${project.title}`,
          html: getInvitationEmailHtml(project.title, inviterName || 'A team member', `${process.env.NEXTAUTH_URL}/projects/${id}`),
        });
        
        return NextResponse.json({ message: 'User added to project' });
      }
      
      // Create invitation token
      // Note: We're reusing company_invitations for now, but strictly this should be a project_invitation
      // Since schema changes are expensive/risky right now, we'll simulate it by sending a tailored email
      // but strictly we can't store project-specific invites cleanly without schema change.
      // FALLBACK: Allow company invite. If they accept, they act as general staff, then must be added to project manually?
      // BETTER: For now, if user doesn't exist, we send a COMPANY invite.
      
      const token = uuidv4();
      const expires = new Date();
      expires.setDate(expires.getDate() + 7); // 7 days
      
      await db.insert(companyInvitations).values({
        companyId,
        email,
        role: 'staff', // Default company role
        token,
        status: 'pending',
        expires: expires.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      // Send invite email
      const inviteLink = `${process.env.NEXTAUTH_URL}/accept-invite?token=${token}`;
      await sendEmail({
        to: email,
        subject: `Invitation to join SIGALIX LABS`,
        html: getInvitationEmailHtml(project.title, inviterName || 'A team member', inviteLink),
      });
      
      return NextResponse.json({ message: 'Invitation sent' });
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      return NextResponse.json({ message: 'Failed to send invitation' }, { status: 500 });
    }
  });
}
