'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Settings, 
  MessageSquare, 
  Kanban as KanbanIcon,
  FileText,
  Loader2,
  UserPlus,
  Calendar,
  Users
} from 'lucide-react';
import { KanbanBoard } from '@/components/projects/KanbanBoard';
import { ProjectMessages } from '@/components/projects/ProjectMessages';
import { ProjectSettingsDialog } from '@/components/projects/ProjectSettingsDialog';
import { InviteMemberDialog } from '@/components/projects/InviteMemberDialog';
import { ProjectMembers } from '@/components/projects/ProjectMembers';
import { ProjectGantt } from '@/components/projects/ProjectGantt';
import { ProjectFiles } from '@/components/projects/ProjectFiles';
import { toast } from 'sonner';

interface Project {
  id: number;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string | null;
  endDate: string | null;
  colorCode: string | null;
  currentUserRole: 'admin' | 'member' | 'viewer' | null;
  boards: Array<{
    id: number;
    title: string;
    position: number;
    cards: Array<{
      id: number;
      title: string;
      description: string | null;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      position: number;
      dueDate: string | null;
      startDate: string | null;
      completedAt: string | null;
    }>;
  }>;
  members: Array<{
    id: number;
    userId: number;
    role: 'admin' | 'member' | 'viewer';
    user: { name: string | null; email: string } | null;
  }>;
}

const statusColors = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  paused: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.projectId);
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/projects');
          return;
        }
        throw new Error('Failed to fetch project');
      }

      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-6 text-center">
        <p className="text-muted-foreground">Project not found</p>
        <Button onClick={() => router.push('/projects')} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  const isAdmin = project.currentUserRole === 'admin';
  const canEdit = project.currentUserRole === 'admin' || project.currentUserRole === 'member';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/projects')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <Badge variant="outline" className={statusColors[project.status]}>
                {project.status}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span>{project.members.length} member{project.members.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{project.boards.reduce((sum, b) => sum + b.cards.length, 0)} cards</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="board" className="flex items-center gap-2">
            <KanbanIcon className="h-4 w-4" />
            Board
          </TabsTrigger>
          <TabsTrigger value="gantt" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Gantt
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Files
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-6">
          <KanbanBoard
            projectId={projectId}
            boards={project.boards}
            isAdmin={canEdit}
            onRefresh={fetchProject}
          />
        </TabsContent>

        <TabsContent value="gantt" className="mt-6">
          <ProjectGantt
            projectId={projectId}
            boards={project.boards}
            onRefresh={fetchProject}
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <ProjectMessages projectId={projectId} />
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <ProjectMembers 
            projectId={projectId} 
            members={project.members}
            isAdmin={isAdmin}
            onRefresh={fetchProject}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <ProjectFiles projectId={projectId} isAdmin={canEdit} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {isAdmin && (
        <>
          <ProjectSettingsDialog
            project={project}
            members={project.members}
            open={showSettings}
            onOpenChange={setShowSettings}
            onUpdated={() => {
              setShowSettings(false);
              fetchProject();
            }}
          />
          <InviteMemberDialog
            projectId={projectId}
            existingMemberIds={project.members.map(m => m.userId)}
            open={showInvite}
            onOpenChange={setShowInvite}
            onMemberAdded={() => {
              setShowInvite(false);
              fetchProject();
            }}
          />
        </>
      )}
    </div>
  );
}
