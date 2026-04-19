import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import { requireAuthContext, isUserAdmin } from '../services/auth.service.js';

export const authRouter = Router();

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = requireAuthContext(req as AuthenticatedRequest);
    const admin = await isUserAdmin(user.id);
    res.json({ userId: user.id, isAdmin: admin });
  }),
);
