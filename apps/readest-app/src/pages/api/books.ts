import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseAdminClient } from '@/utils/supabase';
import { corsAllMethods, runMiddleware } from '@/utils/cors';
import { validateUserAndToken } from '@/utils/access';
import { getDownloadSignedUrl } from '@/utils/object';
import { DBBook } from '@/types/records';

interface RemoteBookRecord extends DBBook {
  coverUrl?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, corsAllMethods);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, token } = await validateUserAndToken(req.headers['authorization']);
    if (!user || !token) {
      return res.status(403).json({ error: 'Not authenticated' });
    }

    const supabase = createSupabaseAdminClient();
    const { data: books, error } = await supabase
      .from('books')
      .select(
        'user_id, book_hash, meta_hash, format, title, source_title, author, group_id, group_name, tags, progress, reading_status, metadata, created_at, updated_at, deleted_at, uploaded_at',
      )
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const records = ((books || []) as DBBook[]).map((book) => ({ ...book })) as RemoteBookRecord[];
    const bookHashes = records.map((book) => book.book_hash).filter(Boolean);

    if (bookHashes.length > 0) {
      const { data: files, error: filesError } = await supabase
        .from('files')
        .select('book_hash, file_key')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .in('book_hash', bookHashes);

      if (filesError) {
        return res.status(500).json({ error: filesError.message });
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
          } catch {}
        }),
      );
    }

    return res.status(200).json({ books: records });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
  }
}
