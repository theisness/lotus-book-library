import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string | undefined) || crypto.randomUUID();
  res.setHeader('x-request-id', requestId);
  next();
};
