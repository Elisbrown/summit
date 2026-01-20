'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  completed: z.boolean(),
  assigneeIds: z.array(z.number()),
});

type FormValues = z.infer<typeof formSchema>;

interface Card {
  id: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  assignees?: {
    id: number;
    userId: number;
    user?: {
      name: string | null;
      email: string;
    } | null;
  }[];
}

interface CardDetailDialogProps {
  projectId: number;
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
  apiBase?: string;
}

const formatDateForInput = (dateStr: string | null) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toISOString().slice(0, 16);
  } catch (e) {
    return '';
  }
};

export function CardDetailDialog({
  projectId,
  card,
  open,
  onOpenChange,
  onUpdated,
  apiBase = '/api',
}: CardDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [members, setMembers] = useState<{ id: number; userId: number; user: { name: string | null; email: string }; role: string }[]>([]);

  // Fetch project members
  useEffect(() => {
    if (open) {
      const fetchMembers = async () => {
        try {
          const response = await fetch(`${apiBase}/projects/${projectId}/members`);
          if (response.ok) {
            const result = await response.json();
            // API returns { data: members[] }
            setMembers(Array.isArray(result) ? result : result.data || []);
          }
        } catch (error) {
          console.error("Failed to fetch members", error);
        }
      };
      fetchMembers();
    }
  }, [open, projectId, apiBase]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: card.title,
      description: card.description || '',
      priority: card.priority,
      startDate: formatDateForInput(card.startDate),
      dueDate: formatDateForInput(card.dueDate),
      completed: !!card.completedAt,
      assigneeIds: card.assignees?.map(a => a.userId) || [],
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${apiBase}/projects/${projectId}/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          priority: values.priority,
          startDate: values.startDate ? new Date(values.startDate) : null,
          dueDate: values.dueDate ? new Date(values.dueDate) : null,
          completedAt: values.completed ? (card.completedAt || new Date()) : null,
          assigneeIds: values.assigneeIds,
        }),
      });

      if (!response.ok) throw new Error('Failed to update card');

      toast.success('Card updated');
      onUpdated();
    } catch (error) {
      console.error('Error updating card:', error);
      toast.error('Failed to update card');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this card?')) return;

    try {
      setDeleting(true);
      const response = await fetch(`${apiBase}/projects/${projectId}/cards/${card.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete card');

      toast.success('Card deleted');
      onUpdated();
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value?.toString() || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assigneeIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignees</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {field.value.map((userId) => {
                      const member = members.find((m) => m.userId === userId);
                      return member ? (
                        <div key={userId} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs flex items-center gap-1">
                          {member.user.name || member.user.email}
                          <button
                            type="button"
                            onClick={() => {
                              const newValue = field.value.filter((id) => id !== userId);
                              field.onChange(newValue);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <Select
                    onValueChange={(value) => {
                      const userId = parseInt(value);
                      if (!field.value.includes(userId)) {
                        field.onChange([...field.value, userId]);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Add assignee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members
                        .filter((m) => !field.value.includes(m.userId))
                        .map((member) => (
                          <SelectItem key={member.userId} value={member.userId.toString()}>
                            {member.user.name || member.user.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2 pt-8">
                 <FormField
                  control={form.control}
                  name="completed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <input 
                          type="checkbox" 
                          checked={!!field.value}
                          onChange={field.onChange}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Mark as Completed
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
