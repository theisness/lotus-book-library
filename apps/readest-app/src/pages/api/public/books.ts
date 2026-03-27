import type { NextApiRequest, NextApiResponse } from 'next';
import { createSupabaseAdminClient } from '@/utils/supabase';
import { corsAllMethods, runMiddleware } from '@/utils/cors';
import { validateUserAndToken } from '@/utils/access';
import { getDownloadSignedUrl } from '@/utils/object';

interface PublicBookRecord {
  id: string;
  owner_user_id: string;
  book_hash: string;
  title: string | null;
  author: string | null;
  format: string | null;
  cover_file_key: string | null;
  book_file_key: string;
  published_at: string;
}

interface PublicBookListResponse {
  books: Array<
    PublicBookRecord & {
      coverUrl?: string;
    }
  >;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await runMiddleware(req, res, corsAllMethods);

  if (req.method === 'GET') {
    return handleList(req, res);
  }
  if (req.method === 'POST') {
    return handlePublish(req, res);
  }
  if (req.method === 'DELETE') {
    return handleUnpublish(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleList(req: NextApiRequest, res: NextApiResponse) {
  try {
    const page = Math.max(parseInt((req.query['page'] as string) || '1'), 1);
    const pageSize = Math.min(Math.max(parseInt((req.query['pageSize'] as string) || '20'), 1), 50);
    const search = ((req.query['search'] as string) || '').trim();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const supabase = createSupabaseAdminClient();
    let query = supabase
      .from('public_books')
      .select(
        'id, owner_user_id, book_hash, title, author, format, cover_file_key, book_file_key, published_at',
        { count: 'exact' },
      )
      .is('deleted_at', null);

    if (search) {
      query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
    }

    const { data, error, count } = await query
      .order('published_at', { ascending: false })
      .range(from, to);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const books: Array<PublicBookRecord & { coverUrl?: string }> = (
      (data || []) as PublicBookRecord[]
    ).map((book) => ({ ...book }));
    await Promise.all(
      books.map(async (book) => {
        if (book.cover_file_key) {
          try {
            book.coverUrl = await getDownloadSignedUrl(book.cover_file_key, 1800);
          } catch {}
        }
      }),
    );

    const total = count || 0;
    const response: PublicBookListResponse = {
      books,
      total,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
    };
    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
  }
}

async function handlePublish(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { user, token } = await validateUserAndToken(req.headers['authorization']);
    if (!user || !token) {
      return res.status(403).json({ error: 'Not authenticated' });
    }

    const { bookHash } = req.body as { bookHash?: string };
    if (!bookHash) {
      return res.status(400).json({ error: 'Missing bookHash' });
    }

    const supabase = createSupabaseAdminClient();
    const { data: fileRecords, error: fileError } = await supabase
      .from('files')
      .select('file_key')
      .eq('user_id', user.id)
      .eq('book_hash', bookHash)
      .is('deleted_at', null);

    if (fileError) {
      return res.status(500).json({ error: fileError.message });
    }

    if (!fileRecords || fileRecords.length === 0) {
      return res.status(404).json({ error: 'No uploaded files found for this book' });
    }

    const coverFile =
      fileRecords.find((f) => f.file_key.toLowerCase().endsWith('/cover.png')) || null;
    const mainFile =
      fileRecords.find((f) => !f.file_key.toLowerCase().endsWith('/cover.png')) || fileRecords[0];

    if (!mainFile) {
      return res.status(404).json({ error: 'Book file not found' });
    }

    const { data: bookRecord } = await supabase
      .from('books')
      .select('title, author, format')
      .eq('user_id', user.id)
      .eq('book_hash', bookHash)
      .is('deleted_at', null)
      .single();

    const payload = {
      owner_user_id: user.id,
      book_hash: bookHash,
      title: bookRecord?.title || null,
      author: bookRecord?.author || null,
      format: bookRecord?.format || null,
      cover_file_key: coverFile?.file_key || null,
      book_file_key: mainFile.file_key,
      deleted_at: null,
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('public_books')
      .upsert(payload, { onConflict: 'owner_user_id,book_hash' })
      .select(
        'id, owner_user_id, book_hash, title, author, format, cover_file_key, book_file_key, published_at',
      )
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ book: data });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
  }
}

async function handleUnpublish(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { user, token } = await validateUserAndToken(req.headers['authorization']);
    if (!user || !token) {
      return res.status(403).json({ error: 'Not authenticated' });
    }

    const bookHash = (req.query['bookHash'] as string) || req.body?.bookHash;
    if (!bookHash) {
      return res.status(400).json({ error: 'Missing bookHash' });
    }

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from('public_books')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('owner_user_id', user.id)
      .eq('book_hash', bookHash)
      .is('deleted_at', null);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
  }
}
