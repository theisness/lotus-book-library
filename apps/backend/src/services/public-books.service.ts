import { createSupabaseAdminClient } from '../lib/supabase.js';
import { getDownloadSignedUrl } from '../lib/object-storage.js';
import { HttpError } from '../lib/http.js';
import type { PublicBookRecord } from '../types/shared.js';

const attachPublicBookCoverUrls = async (books: PublicBookRecord[]) => {
  const records = books.map((book) => ({
    ...book,
    coverUrl: undefined as string | undefined,
  }));

  await Promise.all(
    records.map(async (book) => {
      if (!book.cover_file_key) return;
      try {
        book.coverUrl = await getDownloadSignedUrl(book.cover_file_key, 1800);
      } catch {
        return;
      }
    }),
  );

  return records;
};

export const listPublicBookShelf = async () => {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('public_books')
    .select(
      'id, owner_user_id, book_hash, title, author, format, cover_file_key, book_file_key, published_at',
    )
    .is('deleted_at', null)
    .order('published_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return { books: await attachPublicBookCoverUrls((data || []) as PublicBookRecord[]) };
};

export const listPublicBooks = async (params: {
  page?: number;
  pageSize?: number;
  search?: string;
  format?: string;
  ownerUserId?: string;
}) => {
  const page = Math.max(params.page || 1, 1);
  const pageSize = Math.min(Math.max(params.pageSize || 20, 1), 50);
  const search = (params.search || '').trim();
  const format = (params.format || '').trim().toLowerCase();
  const ownerUserId = (params.ownerUserId || '').trim();
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
  if (format) {
    query = query.ilike('format', format);
  }
  if (ownerUserId) {
    query = query.eq('owner_user_id', ownerUserId);
  }

  const { data, error, count } = await query
    .order('published_at', { ascending: false })
    .range(from, to);
  if (error) {
    throw new Error(error.message);
  }

  const books = await attachPublicBookCoverUrls((data || []) as PublicBookRecord[]);

  const total = count || 0;
  return {
    books,
    total,
    page,
    pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1),
  };
};

export const publishPublicBook = async (userId: string, bookHash: string) => {
  if (!bookHash) {
    throw new HttpError(400, 'Missing bookHash');
  }

  const supabase = createSupabaseAdminClient();
  const { data: fileRecords, error: fileError } = await supabase
    .from('files')
    .select('file_key')
    .eq('user_id', userId)
    .eq('book_hash', bookHash)
    .is('deleted_at', null);

  if (fileError) throw new Error(fileError.message);
  if (!fileRecords || fileRecords.length === 0) {
    throw new HttpError(404, 'No uploaded files found for this book');
  }

  const coverFile =
    fileRecords.find((f) => f.file_key.toLowerCase().endsWith('/cover.png')) || null;
  const mainFile =
    fileRecords.find((f) => !f.file_key.toLowerCase().endsWith('/cover.png')) || fileRecords[0];
  if (!mainFile) {
    throw new HttpError(404, 'Book file not found');
  }

  const { data: bookRecord } = await supabase
    .from('books')
    .select('title, author, format')
    .eq('user_id', userId)
    .eq('book_hash', bookHash)
    .is('deleted_at', null)
    .single();

  const payload = {
    owner_user_id: userId,
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

  if (error) throw new Error(error.message);
  return { book: data };
};

export const unpublishPublicBook = async (userId: string, bookHash: string) => {
  if (!bookHash) {
    throw new HttpError(400, 'Missing bookHash');
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from('public_books')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('owner_user_id', userId)
    .eq('book_hash', bookHash)
    .is('deleted_at', null);

  if (error) throw new Error(error.message);
  return { ok: true };
};

export const getPublicBookDownloadUrl = async (id: string) => {
  if (!id) {
    throw new HttpError(400, 'Missing id');
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('public_books')
    .select('book_file_key')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data?.book_file_key) {
    throw new HttpError(404, 'Public book not found');
  }

  return { downloadUrl: await getDownloadSignedUrl(data.book_file_key, 1800) };
};

export const listMyPublishedBooks = async (userId: string, detail = false) => {
  const supabase = createSupabaseAdminClient();

  if (!detail) {
    const { data, error } = await supabase
      .from('public_books')
      .select('book_hash')
      .eq('owner_user_id', userId)
      .is('deleted_at', null);

    if (error) throw new Error(error.message);
    return { bookHashes: (data || []).map((item) => item.book_hash) };
  }

  const { data, error } = await supabase
    .from('public_books')
    .select(
      'id, owner_user_id, book_hash, title, author, format, cover_file_key, book_file_key, published_at',
    )
    .eq('owner_user_id', userId)
    .is('deleted_at', null)
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message);

  const books = await Promise.all(
    (data || []).map(async (book) => {
      let coverUrl: string | undefined;
      if (book.cover_file_key) {
        try {
          coverUrl = await getDownloadSignedUrl(book.cover_file_key, 1800);
        } catch {
          // ignore cover signing failure per-book
        }
      }
      return { ...book, coverUrl };
    }),
  );

  return { books };
};
