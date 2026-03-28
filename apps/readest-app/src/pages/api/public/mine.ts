import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseAdminClient } from '@/utils/supabase';
import { corsAllMethods, runMiddleware } from '@/utils/cors';
import { validateUserAndToken } from '@/utils/access';
import { getDownloadSignedUrl } from '@/utils/object';

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

    const detail = req.query['detail'] === '1';
    const supabase = createSupabaseAdminClient();

    if (!detail) {
      const { data, error } = await supabase
        .from('public_books')
        .select('book_hash')
        .eq('owner_user_id', user.id)
        .is('deleted_at', null);

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        bookHashes: (data || []).map((item) => item.book_hash),
      });
    }

    // Detail mode: return full book records with signed cover URLs
    const { data, error } = await supabase
      .from('public_books')
      .select(
        'id, owner_user_id, book_hash, title, author, format, cover_file_key, book_file_key, published_at',
      )
      .eq('owner_user_id', user.id)
      .is('deleted_at', null)
      .order('published_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const books = await Promise.all(
      (data || []).map(async (book) => {
        let coverUrl: string | undefined;
        if (book.cover_file_key) {
          try {
            coverUrl = await getDownloadSignedUrl(book.cover_file_key, 1800);
          } catch {}
        }
        return { ...book, coverUrl };
      }),
    );

    return res.status(200).json({ books });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
  }
}
