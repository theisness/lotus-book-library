import { Router } from 'express';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAdmin } from '../middleware/admin.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import { getPublicConfig, upsertPublicConfig } from '../services/public-configs.service.js';

export const publicConfigsRouter = Router();

publicConfigsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const bookHash = req.query['bookHash'] as string;
    if (!bookHash) {
      throw new HttpError(400, 'Missing bookHash');
    }
    const result = await getPublicConfig(bookHash);
    res.status(200).json(result);
  }),
);

publicConfigsRouter.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const { bookHash, location, progress, viewSettings } = req.body || {};
    if (!bookHash) {
      throw new HttpError(400, 'Missing bookHash');
    }
    const result = await upsertPublicConfig(user.id, bookHash, {
      location,
      progress,
      viewSettings,
    });
    res.status(200).json(result);
  }),
);
