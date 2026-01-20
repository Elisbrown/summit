'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { DraggableColumn } from './DraggableColumn';
import { DraggableCard } from './DraggableCard';
import { TaskCard } from './TaskCard';
import { CardDetailDialog } from './CardDetailDialog';
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
  boardId?: number;
  assignees?: Array<{
    id: number;
    userId: number;
    user?: { name: string | null; email: string } | null;
  }>;
}

interface Board {
  id: number;
  title: string;
  position: number;
  cards: Card[];
}

interface KanbanBoardProps {
  projectId: number;
  boards: Board[];
  isAdmin: boolean;
  onRefresh: () => void;
  apiBase?: string; // Defaults to '/api' for admin, use '/api/portal' for clients
}

export function KanbanBoard({ projectId, boards, isAdmin, onRefresh, apiBase = '/api' }: KanbanBoardProps) {


  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [activeCard, setActiveCard] = useState<Card | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedBoards = [...boards].sort((a, b) => a.position - b.position);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const cardId = active.id as number;
    
    // Find the card across all boards
    for (const board of boards) {
      const card = board.cards.find(c => c.id === cardId);
      if (card) {
        setActiveCard({ ...card, boardId: board.id });
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeId = active.id as number;
    const overId = over.id;

    // Find source board and card
    let sourceBoard: Board | undefined;
    let sourceCard: Card | undefined;
    
    for (const board of boards) {
      const card = board.cards.find(c => c.id === activeId);
      if (card) {
        sourceBoard = board;
        sourceCard = card;
        break;
      }
    }

    if (!sourceBoard || !sourceCard) return;

    // Determine target board
    let targetBoardId: number | null = null;
    let targetPosition: number = 0;

    // Check if dropped on a board
    const targetBoard = boards.find(b => b.id === overId);
    if (targetBoard) {
      targetBoardId = targetBoard.id;
      targetPosition = targetBoard.cards.length;
    } else {
      // Dropped on a card - find its board
      for (const board of boards) {
        const card = board.cards.find(c => c.id === overId);
        if (card) {
          targetBoardId = board.id;
          const cardIndex = board.cards.findIndex(c => c.id === overId);
          targetPosition = cardIndex;
          break;
        }
      }
    }

    if (targetBoardId === null) return;

    // Only update if something changed
    if (sourceBoard.id === targetBoardId && sourceCard.position === targetPosition) {
      return;
    }

    try {
      const response = await fetch(`${apiBase}/projects/${projectId}/cards`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: activeId,
          targetBoardId: targetBoardId,
          newPosition: targetPosition,
        }),
      });

      if (!response.ok) throw new Error('Failed to move card');

      onRefresh();
    } catch (error) {
      console.error('Error moving card:', error);
      toast.error('Failed to move card');
    }
  };

  const handleAddBoard = async () => {
    if (!newBoardTitle.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`${apiBase}/projects/${projectId}/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBoardTitle.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create board');

      setNewBoardTitle('');
      setShowAddBoard(false);
      onRefresh();
      toast.success('Column created');
    } catch (error) {
      console.error('Error creating board:', error);
      toast.error('Failed to create column');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-300px)]">
          {sortedBoards.map((board) => (
            <DraggableColumn
              key={board.id}
              board={board}
              projectId={projectId}
              onCardClick={setSelectedCard}
              onCardCreated={onRefresh}
              onBoardDeleted={onRefresh}
              isAdmin={isAdmin}
              apiBase={apiBase}
            />
          ))}

          {/* Add Column */}
          {isAdmin && (
            <div className="flex-shrink-0 w-72">
              {showAddBoard ? (
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <Input
                    value={newBoardTitle}
                    onChange={(e) => setNewBoardTitle(e.target.value)}
                    placeholder="Enter column title..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddBoard();
                      if (e.key === 'Escape') {
                        setNewBoardTitle('');
                        setShowAddBoard(false);
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={handleAddBoard}
                      disabled={loading || !newBoardTitle.trim()}
                    >
                      Add Column
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => {
                        setNewBoardTitle('');
                        setShowAddBoard(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-10 border-dashed"
                  onClick={() => setShowAddBoard(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              )}
            </div>
          )}
        </div>

        <DragOverlay>
          {activeCard && (
            <div className="rotate-3 opacity-90">
              <TaskCard card={activeCard} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
          apiBase={apiBase}
        />
      )}
    </>
  );
}
