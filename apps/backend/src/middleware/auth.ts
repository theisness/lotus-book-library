import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import { validateUserAndToken } from '../services/auth.service.js';

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { user, token } = await validateUserAndToken(req.headers.authorization);
  if (!user || !token) {
    return res.status(403).json({ error: 'Not authenticated' });
  }

  req.auth = {
    user: { id: user.id },
    token,
  };
  return next();
};
