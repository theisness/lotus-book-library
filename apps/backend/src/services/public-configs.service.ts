import { createSupabaseAdminClient } from '../lib/supabase.js';

export const getPublicConfig = async (bookHash: string) => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('public_book_configs')
    .select('book_hash, admin_user_id, location, progress, view_settings, created_at, updated_at')
    .eq('book_hash', bookHash)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(error.message);
  }

  return data;
};

export const upsertPublicConfig = async (
  adminUserId: string,
  bookHash: string,
  config: { location?: string; progress?: string; viewSettings?: string },
) => {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('public_book_configs')
    .upsert(
      {
        book_hash: bookHash,
        admin_user_id: adminUserId,
        location: config.location ?? null,
        progress: config.progress ?? null,
        view_settings: config.viewSettings ?? null,
        updated_at: now,
      },
      { onConflict: 'book_hash' },
    )
    .select('book_hash, admin_user_id, location, progress, view_settings, created_at, updated_at');

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
};
