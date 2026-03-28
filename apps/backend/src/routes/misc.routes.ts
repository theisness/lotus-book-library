import { Router } from 'express';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import { proxyKoSync } from '../services/kosync.service.js';
import { deleteUserAccount } from '../services/user.service.js';
import { translateWithDeepL } from '../services/deepl.service.js';
import type { KoSyncProxyPayload } from '../types/shared.js';

export const miscRouter = Router();

miscRouter.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

miscRouter.post(
  '/kosync',
  asyncHandler(async (req, res) => {
    const result = await proxyKoSync(req.body as KoSyncProxyPayload);
    res.status(result.status);
    try {
      res.json(JSON.parse(result.data));
    } catch {
      res.send(result.data);
    }
  }),
);

miscRouter.delete(
  '/user/delete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const result = await deleteUserAccount(user.id);
    res.status(200).json(result);
  }),
);

miscRouter.post(
  '/deepl/translate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { user, token } = (req as AuthenticatedRequest).auth!;
    const body = req.body as {
      text?: string[];
      source_lang?: string;
      target_lang?: string;
      use_cache?: boolean;
    };
    if (!body.text || !Array.isArray(body.text)) {
      throw new HttpError(400, 'Missing translation text');
    }
    const result = await translateWithDeepL({
      userId: user.id,
      token,
      text: body.text,
      sourceLang: body.source_lang,
      targetLang: body.target_lang,
      useCache: body.use_cache,
    });
    res.status(200).json(result);
  }),
);
