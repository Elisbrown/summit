import { NextRequest, NextResponse } from 'next/server';
import { getClientSession } from '@/lib/auth/client/utils';
import { getAuthInfo } from '@/lib/auth/getAuthInfo';
import { db } from '@/lib/db';
import { clientProjects, projects } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export interface DualAuthInfo {
  type: 'user' | 'client';
  userId?: number;
  clientId?: number;
  companyId?: number;
  role?: string;
}

/**
 * Attempts authentication as user first, then as client.
 * Returns null if neither authentication succeeds.
 */
export async function getDualAuth(request: NextRequest): Promise<DualAuthInfo | null> {
  // Try user authentication first
  try {
    const authInfo = await getAuthInfo(request);
    if (authInfo) {
      return {
        type: 'user',
        userId: authInfo.userId,
        companyId: authInfo.companyId,
        role: authInfo.role,
      };
    }
  } catch {
    // User auth failed, try client
  }

  // Try client authentication
  const clientSession = await getClientSession();
  if (clientSession) {
    return {
      type: 'client',
      clientId: clientSession.clientId,
    };
  }

  return null;
}

/**
 * Verifies client has access to a project via clientProjects table.
 */
export async function verifyClientProjectAccess(projectId: number, clientId: number): Promise<boolean> {
  const [access] = await db
    .select()
    .from(clientProjects)
    .where(and(eq(clientProjects.projectId, projectId), eq(clientProjects.clientId, clientId)));
  return !!access;
}

/**
 * Verifies user has access to a project (belongs to their company).
 */
export async function verifyUserProjectAccess(projectId: number, companyId: number): Promise<boolean> {
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId), eq(projects.softDelete, false)));
  return !!project;
}
