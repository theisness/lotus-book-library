import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { listPublicBookShelf } from '../services/public-books.service.js';

export const publicBookRouter = Router();

publicBookRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const result = await listPublicBookShelf();
    res.status(200).json(result);
  }),
);
