import { z } from 'zod';

// Validate generic toggle body: targetId + targetModel
const toggle = z.object({
  body: z.object({
    targetId: z
      .string({ required_error: 'Target ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid Target ID format'),
    targetModel: z
      .string({ required_error: 'Target model is required' })
      .min(1, 'Target model must be provided')
      .regex(/^[A-Za-z][A-Za-z0-9_]*$/, 'Invalid model name format'),
  }),
});

// Validate query for listing bookmarks; allow optional targetModel
const getUserBookmarksQuery = z.object({
  query: z.object({
    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .transform(Number)
      .optional(),
    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a number')
      .transform(Number)
      .optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    targetModel: z.string().optional(),
    // Task-specific filters (used only when targetModel === 'Task')
    category: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID format')
      .optional(),
    searchTerm: z.string().optional(),
  }),
});

export const BookmarkValidation = {
  toggle,
  getUserBookmarksQuery,
};
