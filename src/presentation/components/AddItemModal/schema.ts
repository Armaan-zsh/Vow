import { z } from 'zod';
import { ItemType } from '../../../core/entities/Item';

export const addItemSchema = z.object({
  type: z.nativeEnum(ItemType),
  title: z.string().min(1, 'Title is required').max(500, 'Title too long'),
  author: z.string().max(200).optional(),
  url: z.string().url('Invalid URL').optional().or(z.literal('')),
  isbn: z.string().regex(/^(97[89])?\d{9}[\dX]$/, 'Invalid ISBN').optional().or(z.literal('')),
  doi: z.string().regex(/^10\.\d{4,}\/[^\s]+$/, 'Invalid DOI').optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  tags: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  readDate: z.string().optional(),
});

export type AddItemFormData = z.infer<typeof addItemSchema>;