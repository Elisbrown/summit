'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Users, Calendar, CircleDot, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectCardProps {
  project: {
    id: number;
    title: string;
    description: string | null;
    status: 'active' | 'completed' | 'paused' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    startDate: string | null;
    endDate: string | null;
    colorCode: string | null;
    memberCount: number;
    currentUserRole?: 'admin' | 'member' | 'viewer' | null;
  };
  onEdit?: (project: any) => void;
  onDelete?: (project: any) => void;
}

const statusColors = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  paused: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const priorityColors = {
  low: 'bg-slate-500/10 text-slate-600',
  medium: 'bg-blue-500/10 text-blue-600',
  high: 'bg-orange-500/10 text-orange-600',
  urgent: 'bg-red-500/10 text-red-600',
};

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/projects/${project.id}`);
  };

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Allow actions if explicitly passed, or check role if available
  // Simple check: if callbacks are provided, show the menu
  const showActions = !!onEdit || !!onDelete;

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4 group relative"
      style={{ borderLeftColor: project.colorCode || '#6366f1' }}
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold line-clamp-1 pr-6">
            {project.title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColors[project.status]}>
              {project.status}
            </Badge>
            {showActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={(e) => handleAction(e, () => onEdit(project))}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      className="text-red-600" 
                      onClick={(e) => handleAction(e, () => onDelete(project))}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {project.description}
          </p>
        )}
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CircleDot className="h-3 w-3" />
            <Badge variant="secondary" className={priorityColors[project.priority]}>
              {project.priority}
            </Badge>
          </div>
          
          {project.memberCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{project.memberCount}</span>
            </div>
          )}
          
          {project.endDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(project.endDate), 'MMM d')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
