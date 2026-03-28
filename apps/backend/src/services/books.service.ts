import { createSupabaseAdminClient } from '../lib/supabase.js';
import { getDownloadSignedUrl } from '../lib/object-storage.js';
import type { DBBook, RemoteBookRecord } from '../types/shared.js';

export const listMyBooks = async (userId: string): Promise<RemoteBookRecord[]> => {
  const supabase = createSupabaseAdminClient();
  const { data: books, error } = await supabase
    .from('books')
    .select(
      'user_id, book_hash, meta_hash, format, title, source_title, author, group_id, group_name, tags, progress, reading_status, metadata, created_at, updated_at, deleted_at, uploaded_at',
    )
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const records = ((books || []) as DBBook[]).map((book) => ({ ...book })) as RemoteBookRecord[];
  const bookHashes = records.map((book) => book.book_hash).filter(Boolean);

  if (bookHashes.length === 0) {
    return records;
  }

  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('book_hash, file_key')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .in('book_hash', bookHashes);

  if (filesError) {
    throw new Error(filesError.message);
  }

  const coverMap = new Map<string, string>();
  for (const file of files || []) {
    if (file.book_hash && file.file_key?.toLowerCase().endsWith('/cover.png')) {
      coverMap.set(file.book_hash, file.file_key);
    }
  }

  await Promise.all(
    records.map(async (book) => {
      const coverFileKey = coverMap.get(book.book_hash);
      if (!coverFileKey) return;
      try {
        book.coverUrl = await getDownloadSignedUrl(coverFileKey, 1800);
      } catch {
        // ignore cover signing failure per-book
      }
    }),
  );

  return records;
};
