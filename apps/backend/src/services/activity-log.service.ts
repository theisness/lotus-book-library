import { createSupabaseAdminClient } from '../lib/supabase.js';

export interface LogActivityParams {
  action: 'book_published' | 'book_updated' | 'book_unpublished' | 'note_added';
  actorUserId: string;
  targetBookHash: string;
  targetBookTitle?: string | null;
  details?: Record<string, unknown>;
}

export const logActivity = async (params: LogActivityParams) => {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from('activity_log').insert({
      action: params.action,
      actor_user_id: params.actorUserId,
      target_book_hash: params.targetBookHash,
      target_book_title: params.targetBookTitle ?? null,
      details: params.details ?? null,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const listActivities = async (page: number, pageSize: number) => {
  const supabase = createSupabaseAdminClient();

  // First get the total count
  const { count, error: countError } = await supabase
    .from('activity_log')
    .select('id', { count: 'exact', head: true });

  if (countError) {
    throw new Error(countError.message);
  }

  const total = count || 0;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  // If no records exist, return empty result without querying range
  if (total === 0) {
    return { activities: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('activity_log')
    .select('id, action, actor_user_id, target_book_hash, target_book_title, details, created_at')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  return {
    activities: data || [],
    total,
    page,
    pageSize,
    totalPages,
  };
};
