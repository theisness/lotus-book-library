import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http.js';

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
};

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  const message = error instanceof Error ? error.message : 'Something went wrong';
  console.error(error);
  return res.status(500).json({ error: message });
};
