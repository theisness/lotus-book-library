import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../lib/http.js';
import { requireAdmin } from '../middleware/admin.js';
import {
  adminUploadPublicBook,
  getPublicBookDownloadUrl,
  listPublicBooks,
  unpublishPublicBook,
  updatePublicBook,
} from '../services/public-books.service.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

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
  '/books/upload',
  requireAdmin,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const file = (req as Express.Request & { file?: Express.Multer.File }).file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { title, author } = req.body || {};
    const result = await adminUploadPublicBook(user.id, file, { title, author });
    res.status(200).json(result);
  }),
);

publicRouter.delete(
  '/books',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const bookHash = (req.query['bookHash'] as string) || (req.body?.bookHash as string);
    const result = await unpublishPublicBook(user.id, bookHash);
    res.status(200).json(result);
  }),
);

publicRouter.patch(
  '/books',
  requireAdmin,
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
