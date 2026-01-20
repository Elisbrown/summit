'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { DraggableCard } from './DraggableCard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Card {
  id: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  position: number;
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  assignees?: Array<{
    id: number;
    userId: number;
    user?: { name: string | null; email: string } | null;
  }>;
}

interface DraggableColumnProps {
  board: {
    id: number;
    title: string;
    position: number;
    cards: Card[];
  };
  projectId: number;
  onCardClick: (card: Card) => void;
  onCardCreated: () => void;
  onBoardDeleted: () => void;
  isAdmin: boolean;
  apiBase?: string;
}

export function DraggableColumn({
  board,
  projectId,
  onCardClick,
  onCardCreated,
  onBoardDeleted,
  isAdmin,
  apiBase = '/api',
}: DraggableColumnProps) {
  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: board.id,
  });

  const handleAddCard = async () => {
    if (!newCardTitle.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/projects/${projectId}/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: board.id,
          title: newCardTitle.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create card');

      setNewCardTitle('');
      setShowAddCard(false);
      onCardCreated();
      toast.success('Card created');
    } catch (error) {
      console.error('Error creating card:', error);
      toast.error('Failed to create card');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBoard = async () => {
    if (!confirm(`Delete "${board.title}" and all its cards?`)) return;

    try {
      const response = await fetch(
        `${apiBase}/projects/${projectId}/boards/${board.id}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete board');

      onBoardDeleted();
      toast.success('Board deleted');
    } catch (error) {
      console.error('Error deleting board:', error);
      toast.error('Failed to delete board');
    }
  };

  const sortedCards = [...board.cards].sort((a, b) => a.position - b.position);

  return (
    <div 
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 rounded-xl p-3 transition-all border shadow-sm ${
        isOver ? 'bg-primary/10 border-primary/20 ring-2 ring-primary/20' : 'bg-secondary/40 border-border/60 hover:border-border'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{board.title}</h3>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            {board.cards.length}
          </span>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="text-destructive"
                onClick={handleDeleteBoard}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Cards */}
      <SortableContext
        items={sortedCards.map(c => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[100px]">
          {sortedCards.map((card) => (
            <DraggableCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add Card */}
      {showAddCard ? (
        <div className="mt-2 space-y-2">
          <Input
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            placeholder="Enter card title..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCard();
              if (e.key === 'Escape') {
                setNewCardTitle('');
                setShowAddCard(false);
              }
            }}
          />
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleAddCard}
              disabled={loading || !newCardTitle.trim()}
            >
              Add
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => {
                setNewCardTitle('');
                setShowAddCard(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          className="w-full mt-2 justify-start text-muted-foreground"
          onClick={() => setShowAddCard(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add card
        </Button>
      )}
    </div>
  );
}
