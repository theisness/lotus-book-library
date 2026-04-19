import { Router } from 'express';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import { isUserAdmin } from '../services/auth.service.js';
import { pullChanges, pushChanges } from '../services/sync.service.js';
import { logActivity } from '../services/activity-log.service.js';
import { createSupabaseAdminClient } from '../lib/supabase.js';
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
    const payload = req.body as SyncData;
    const result = await pushChanges({
      token,
      userId: user.id,
      payload,
    });

    // Log activity when admin syncs notes for public books
    if (payload.notes && payload.notes.length > 0) {
      try {
        const admin = await isUserAdmin(user.id);
        if (admin) {
          const bookHashes = [
            ...new Set(payload.notes.map((n) => String(n.book_hash || '')).filter(Boolean)),
          ];
          if (bookHashes.length > 0) {
            const supabase = createSupabaseAdminClient();
            const { data: publicBooks } = await supabase
              .from('public_books')
              .select('book_hash, title')
              .in('book_hash', bookHashes)
              .is('deleted_at', null);

            if (publicBooks && publicBooks.length > 0) {
              for (const pb of publicBooks) {
                await logActivity({
                  action: 'note_added',
                  actorUserId: user.id,
                  targetBookHash: pb.book_hash,
                  targetBookTitle: pb.title,
                  details: {
                    noteCount: payload.notes.filter(
                      (n) => String(n.book_hash || '') === pb.book_hash && !n.deleted_at,
                    ).length,
                  },
                });
              }
            }
          }
        }
      } catch {
        // Don't block sync if activity logging fails
      }
    }

    res.status(200).json(result);
  }),
);
