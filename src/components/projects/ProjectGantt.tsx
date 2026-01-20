'use client';

import { useState, useMemo } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardDetailDialog } from './CardDetailDialog';
import { differenceInDays, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface Card {
  id: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  boardId?: number;
}

interface ProjectGanttProps {
  projectId: number;
  boards: Array<{
    id: number;
    title: string;
    cards: Card[];
  }>;
  onRefresh: () => void;
}

const priorityColors = {
  low: '#10b981',      // green
  medium: '#f59e0b',   // amber
  high: '#f97316',     // orange
  urgent: '#ef4444',   // red
};

export function ProjectGantt({ projectId, boards, onRefresh }: ProjectGanttProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  // Transform cards to tasks and calculate project timeline
  const { tasks, projectStart, projectEnd, totalDays } = useMemo(() => {
    const tasks: Task[] = [];
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    const now = new Date();

    boards.forEach(board => {
      if (board.cards.length > 0) {
        tasks.push({
          start: new Date(), // Placeholder, updated later if tasks exist
          end: new Date(),
          name: board.title,
          id: `board-${board.id}`,
          type: 'project',
          progress: 100,
          hideChildren: false,
        });

        board.cards.forEach(card => {
          if (!card.startDate && !card.dueDate) return;

          const start = card.startDate ? new Date(card.startDate) : new Date();
          const end = card.dueDate ? new Date(card.dueDate) : new Date(start.getTime() + 86400000);
          
          if (end <= start) end.setTime(start.getTime() + 86400000);

          // Update project bounds
          if (!minDate || start < minDate) minDate = start;
          if (!maxDate || end > maxDate) maxDate = end;

          // Check for overdue
          const isOverdue = !card.completedAt && end < now;
          const color = isOverdue ? '#dc2626' : priorityColors[card.priority];

          tasks.push({
            start,
            end,
            name: card.title,
            id: `card-${card.id}`,
            type: 'task',
            progress: card.completedAt ? 100 : 0,
            project: `board-${board.id}`,
            styles: {
              backgroundColor: color,
              progressColor: color,
              progressSelectedColor: color,
            },
            isDisabled: true,
          });
        });
      }
    });

    // Update Project row dates to encompass children? 
    // Gantt-task-react usually handles project type by children, but let's leave as is.

    const totalDays = minDate && maxDate ? differenceInDays(maxDate, minDate) + 1 : 0;

    return { 
      tasks, 
      projectStart: minDate, 
      projectEnd: maxDate, 
      totalDays 
    };
  }, [boards]);

  const handleTaskChange = (task: Task) => {
    console.log("On date change", task);
  };

  const handleTaskDelete = (task: Task) => {
    // Not implemented
  };

  const handleSelect = (task: Task, isSelected: boolean) => {
    if (isSelected && task.id.startsWith('card-')) {
      const cardId = parseInt(task.id.replace('card-', ''));
      const card = boards.flatMap(b => b.cards).find(c => c.id === cardId);
      if (card) {
        setSelectedCard(card);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Project Summary Header */}
      {projectStart && projectEnd && (
        <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg shadow-sm">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground">Project Timeline</h3>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{format(projectStart, 'MMM d, yyyy')}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-semibold text-lg">{format(projectEnd, 'MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="text-right">
             <div className="text-sm font-medium text-muted-foreground">Total Duration</div>
             <div className="text-2xl font-bold">{totalDays} Days</div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
         {/* Could add filters here */}
        <Select 
          value={viewMode} 
          onValueChange={(v) => setViewMode(v as ViewMode)}
        >
          <SelectTrigger className="w-32 bg-background border-input">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ViewMode.Day}>Day</SelectItem>
            <SelectItem value={ViewMode.Week}>Week</SelectItem>
            <SelectItem value={ViewMode.Month}>Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <style jsx global>{`
        /* Gantt Chart Dark Mode Overrides */
        .items-container svg {
           font-family: inherit !important;
        }
        
        /* Text Colors */
        .dark .gantt-container text {
          fill: var(--foreground) !important;
        }
        .dark .gantt-container .barLabel {
          fill: var(--foreground) !important;
        }
        
        /* Grid Lines */
        .dark .gantt-container .gridRow, 
        .dark .gantt-container .gridTick {
          stroke: var(--border) !important;
        }
        
        /* Header Background */
        .dark .gantt-container .calendar-header rect {
          fill: var(--card) !important;
        }
        
        /* Task List Background */
        .dark .gantt-container .task-list-header {
           background-color: var(--card) !important;
           color: var(--foreground) !important;
        }
        .dark .gantt-container .task-list-item {
           background-color: var(--card) !important;
           color: var(--foreground) !important;
           border-bottom-color: var(--border) !important;
        }
        
        /* Scrollbar */
        .dark .gantt-vertical-scroll, 
        .dark .gantt-horizontal-scroll {
           background-color: var(--muted) !important;
        }
      `}</style>

      {tasks.length > 0 ? (
        <div className="border border-border rounded-lg overflow-hidden bg-white dark:bg-card">
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            onDateChange={handleTaskChange}
            onDelete={handleTaskDelete}
            onSelect={handleSelect}
            listCellWidth="155px"
            columnWidth={viewMode === ViewMode.Month ? 300 : 65}
            rowHeight={40}
            fontSize="12px"
            barCornerRadius={4}
            todayColor="rgba(var(--primary), 0.1)"
          />
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
          <p>No tasks with dates found.</p>
          <p className="text-sm">Add start and due dates to your cards to see them here.</p>
        </div>
      )}

      {selectedCard && (
        <CardDetailDialog
          projectId={projectId}
          card={selectedCard}
          open={!!selectedCard}
          onOpenChange={(open: boolean) => !open && setSelectedCard(null)}
          onUpdated={() => {
            setSelectedCard(null);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
