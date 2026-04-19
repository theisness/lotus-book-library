import { createSupabaseAdminClient } from '../lib/supabase.js';
import { logActivity } from './activity-log.service.js';

export interface PublicNoteInput {
  id: string;
  type: string;
  cfi: string;
  text?: string;
  style?: string;
  color?: string;
  note?: string;
}

export const getPublicNotes = async (bookHash: string) => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('public_book_notes')
    .select(
      'id, book_hash, admin_user_id, type, cfi, text, style, color, note, created_at, updated_at',
    )
    .eq('book_hash', bookHash)
    .is('deleted_at', null);

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

export const upsertPublicNotes = async (
  adminUserId: string,
  bookHash: string,
  notes: PublicNoteInput[],
) => {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const rows = notes.map((note) => ({
    id: note.id,
    book_hash: bookHash,
    admin_user_id: adminUserId,
    type: note.type,
    cfi: note.cfi,
    text: note.text ?? null,
    style: note.style ?? null,
    color: note.color ?? null,
    note: note.note ?? null,
    updated_at: now,
  }));

  const { data, error } = await supabase
    .from('public_book_notes')
    .upsert(rows, { onConflict: 'book_hash,id' })
    .select(
      'id, book_hash, admin_user_id, type, cfi, text, style, color, note, created_at, updated_at',
    );

  if (error) {
    throw new Error(error.message);
  }

  await logActivity({
    action: 'note_added',
    actorUserId: adminUserId,
    targetBookHash: bookHash,
    details: { noteCount: notes.length },
  });

  return data || [];
};

export const deletePublicNote = async (adminUserId: string, bookHash: string, noteId: string) => {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('public_book_notes')
    .update({ deleted_at: now, updated_at: now })
    .eq('book_hash', bookHash)
    .eq('id', noteId);

  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
};
