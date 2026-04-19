import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import { validateUserAndToken, isUserAdmin } from '../services/auth.service.js';

export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const { user, token } = await validateUserAndToken(req.headers.authorization);
  if (!user || !token) {
    return res.status(403).json({ error: 'Not authenticated' });
  }

  const admin = await isUserAdmin(user.id);
  if (!admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  req.auth = { user: { id: user.id }, token };
  return next();
};
