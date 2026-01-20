import { z } from 'zod';

// Project schema
export const projectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).default('active'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  colorCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  memberIds: z.array(z.number()).optional(), // Users to invite on creation
  clientId: z.number().optional().nullable(), // Client to link
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

// Project member schema
export const projectMemberSchema = z.object({
  userId: z.number().positive('User ID is required'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export type ProjectMemberFormValues = z.infer<typeof projectMemberSchema>;

// Board schema
export const boardSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  position: z.number().int().min(0).optional(),
});

export type BoardFormValues = z.infer<typeof boardSchema>;

// Board reorder schema (batch update)
export const boardReorderSchema = z.object({
  boards: z.array(z.object({
    id: z.number(),
    position: z.number().int().min(0),
  })),
});

export type BoardReorderFormValues = z.infer<typeof boardReorderSchema>;

// Card schema
export const cardSchema = z.object({
  boardId: z.number().positive('Board ID is required'),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  position: z.number().int().min(0).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  startDate: z.coerce.date().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  completedAt: z.coerce.date().optional().nullable(),
  assigneeIds: z.array(z.number()).optional(), // Users to assign
});

export type CardFormValues = z.infer<typeof cardSchema>;

// Card move schema (drag-and-drop)
export const cardMoveSchema = z.object({
  cardId: z.number().positive(),
  targetBoardId: z.number().positive(),
  newPosition: z.number().int().min(0),
});

export type CardMoveFormValues = z.infer<typeof cardMoveSchema>;

// Project message schema
export const projectMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  replyToId: z.number().optional().nullable(),
  fileIds: z.array(z.number()).optional(), // Attached file IDs
});

export type ProjectMessageFormValues = z.infer<typeof projectMessageSchema>;

// Calendar event schema
export const calendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  type: z.enum(['event', 'reminder', 'task', 'meeting']).default('event'),
  allDay: z.boolean().default(false),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  projectId: z.number().optional().nullable(),
});

export type CalendarEventFormValues = z.infer<typeof calendarEventSchema>;

// Params schemas for routes
export const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const boardParamsSchema = z.object({
  projectId: z.string().min(1),
  boardId: z.string().min(1),
});

export const cardParamsSchema = z.object({
  projectId: z.string().min(1),
  cardId: z.string().min(1),
});

export const calendarEventParamsSchema = z.object({
  eventId: z.string().min(1),
});
