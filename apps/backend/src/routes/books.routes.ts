import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { listMyBooks } from '../services/books.service.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';

export const booksRouter = Router();

booksRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const books = await listMyBooks(user.id);
    res.status(200).json({ books });
  }),
);
