'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskCard } from './TaskCard';

interface Card {
  id: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  position: number;
  dueDate: string | null;
  startDate: string | null;
  assignees?: Array<{
    id: number;
    userId: number;
    user?: { name: string | null; email: string } | null;
  }>;
}

interface DraggableCardProps {
  card: Card;
  onClick: () => void;
}

export function DraggableCard({ card, onClick }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      onClick={(e) => {
        // Prevent click when dragging
        if (!isDragging) {
          onClick();
        }
      }}
    >
      <TaskCard card={card} />
    </div>
  );
}
