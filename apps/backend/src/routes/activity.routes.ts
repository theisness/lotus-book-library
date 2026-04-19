import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { listActivities } from '../services/activity-log.service.js';

export const activityRouter = Router();

activityRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query['pageSize'] as string, 10) || 20));

    const result = await listActivities(page, pageSize);
    res.status(200).json(result);
  }),
);
