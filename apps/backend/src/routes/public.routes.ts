import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import {
  getPublicBookDownloadUrl,
  listMyPublishedBooks,
  listPublicBooks,
  publishPublicBook,
  unpublishPublicBook,
  updatePublicBook,
} from '../services/public-books.service.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';

export const publicRouter = Router();

publicRouter.get(
  '/books',
  asyncHandler(async (req, res) => {
    const result = await listPublicBooks({
      page: req.query['page'] ? parseInt(String(req.query['page']), 10) : undefined,
      pageSize: req.query['pageSize'] ? parseInt(String(req.query['pageSize']), 10) : undefined,
      search: req.query['search'] ? String(req.query['search']) : undefined,
      format: req.query['format'] ? String(req.query['format']) : undefined,
      ownerUserId: req.query['ownerUserId'] ? String(req.query['ownerUserId']) : undefined,
    });
    res.status(200).json(result);
  }),
);

publicRouter.post(
  '/books',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const result = await publishPublicBook(user.id, req.body?.bookHash as string);
    res.status(200).json(result);
  }),
);

publicRouter.delete(
  '/books',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const bookHash = (req.query['bookHash'] as string) || (req.body?.bookHash as string);
    const result = await unpublishPublicBook(user.id, bookHash);
    res.status(200).json(result);
  }),
);

publicRouter.patch(
  '/books',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const { bookHash, title, author, coverFileKey } = req.body || {};
    const result = await updatePublicBook(user.id, bookHash as string, {
      title,
      author,
      coverFileKey,
    });
    res.status(200).json(result);
  }),
);

publicRouter.get(
  '/download',
  asyncHandler(async (req, res) => {
    const result = await getPublicBookDownloadUrl(String(req.query['id'] || ''));
    res.status(200).json(result);
  }),
);

publicRouter.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const detail = req.query['detail'] === '1';
    const result = await listMyPublishedBooks(user.id, detail);
    res.status(200).json(result);
  }),
);
