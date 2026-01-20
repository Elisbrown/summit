'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

interface TaskCardProps {
  card: {
    id: number;
    title: string;
    description?: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate?: string | null;
    assignees?: Array<{
      id: number;
      userId: number;
      user?: { name: string | null; email: string } | null;
    }>;
  };
  onClick?: () => void;
}

const priorityColors = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
  high: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
};

export function TaskCard({ card, onClick }: TaskCardProps) {
  const isDueSoon = card.dueDate && 
    new Date(card.dueDate) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all group"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {card.title}
          </p>
        </div>

        {card.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {card.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-xs ${priorityColors[card.priority]}`}>
              {card.priority}
            </Badge>
            
            {card.dueDate && (
              <div className={`flex items-center gap-1 text-xs ${isDueSoon ? 'text-red-500' : 'text-muted-foreground'}`}>
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(card.dueDate), 'MMM d')}</span>
              </div>
            )}
          </div>

          {card.assignees && card.assignees.length > 0 && (
            <div className="flex -space-x-2">
              {card.assignees.slice(0, 3).map((assignee) => (
                <div
                  key={assignee.id}
                  className="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center"
                  title={assignee.user?.name || assignee.user?.email || 'Unknown'}
                >
                  <span className="text-[10px] font-medium">
                    {(assignee.user?.name || assignee.user?.email || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              ))}
              {card.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                  +{card.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
