import { Router } from 'express';
import { asyncHandler, HttpError } from '../lib/http.js';
import { requireAdmin } from '../middleware/admin.js';
import { createSupabaseAdminClient } from '../lib/supabase.js';
import type { AuthenticatedRequest } from '../services/auth.service.js';
import {
  getPublicNotes,
  upsertPublicNotes,
  deletePublicNote,
} from '../services/public-notes.service.js';

export const publicNotesRouter = Router();

// GET /admin-notes?bookHash=xxx — fetch admin's private notes for a public book (no auth needed)
publicNotesRouter.get(
  '/admin-notes',
  asyncHandler(async (req, res) => {
    const bookHash = req.query['bookHash'] as string;
    if (!bookHash) {
      throw new HttpError(400, 'Missing bookHash');
    }

    const supabase = createSupabaseAdminClient();

    // Verify this is a published public book
    const { data: publicBook } = await supabase
      .from('public_books')
      .select('owner_user_id')
      .eq('book_hash', bookHash)
      .is('deleted_at', null)
      .single();

    if (!publicBook) {
      res.status(200).json([]);
      return;
    }

    // Fetch the admin's notes from the private book_notes table
    const { data: notes, error } = await supabase
      .from('book_notes')
      .select('id, book_hash, type, cfi, text, style, color, note, created_at, updated_at')
      .eq('user_id', publicBook.owner_user_id)
      .eq('book_hash', bookHash)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    res.status(200).json(notes || []);
  }),
);

publicNotesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const bookHash = req.query['bookHash'] as string;
    if (!bookHash) {
      throw new HttpError(400, 'Missing bookHash');
    }
    const result = await getPublicNotes(bookHash);
    res.status(200).json(result);
  }),
);

publicNotesRouter.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const { bookHash, notes } = req.body || {};
    if (!bookHash) {
      throw new HttpError(400, 'Missing bookHash');
    }
    if (!Array.isArray(notes)) {
      throw new HttpError(400, 'Missing or invalid notes');
    }
    const result = await upsertPublicNotes(user.id, bookHash, notes);
    res.status(200).json(result);
  }),
);

publicNotesRouter.delete(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { user } = (req as AuthenticatedRequest).auth!;
    const bookHash = req.query['bookHash'] as string;
    const noteId = req.query['noteId'] as string;
    if (!bookHash) {
      throw new HttpError(400, 'Missing bookHash');
    }
    if (!noteId) {
      throw new HttpError(400, 'Missing noteId');
    }
    const result = await deletePublicNote(user.id, bookHash, noteId);
    res.status(200).json(result);
  }),
);
