import { Router } from 'express';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import { pullChanges, pushChanges } from '../services/sync.service.js';
import type { SyncData, SyncType } from '../types/shared.js';

export const syncRouter = Router();

syncRouter.use(requireAuth);

syncRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { user, token } = (req as AuthenticatedRequest).auth!;
    const sinceParam = req.query['since'];
    if (!sinceParam) {
      throw new HttpError(400, '"since" query parameter is required');
    }

    const result = await pullChanges({
      token,
      userId: user.id,
      since: Number(sinceParam),
      type: req.query['type'] as SyncType | undefined,
      book: req.query['book'] ? String(req.query['book']) : undefined,
      metaHash: req.query['meta_hash'] ? String(req.query['meta_hash']) : undefined,
    });

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.status(200).json(result);
  }),
);

syncRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { user, token } = (req as AuthenticatedRequest).auth!;
    const result = await pushChanges({
      token,
      userId: user.id,
      payload: req.body as SyncData,
    });
    res.status(200).json(result);
  }),
);
