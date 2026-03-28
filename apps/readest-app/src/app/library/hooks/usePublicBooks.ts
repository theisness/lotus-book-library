import { useEffect, useState } from 'react';
import { Book } from '@/types/book';
import { listPublicBookShelf, getPublicBookDownloadUrl, type PublicBook } from '@/libs/publicBooks';

export const PUBLIC_BOOKS_GROUP_NAME = '公共书架';

// Convert a PublicBook from the public API into a library-compatible Book object.
const publicBookToBook = (pub: PublicBook): Book => ({
  hash: `public-${pub.id}`,
  format: (pub.format?.toUpperCase() as Book['format']) || 'EPUB',
  title: pub.title || '未知书名',
  author: pub.author || '',
  coverImageUrl: pub.coverUrl || null,
  url: `__public__${pub.id}:${pub.book_hash}`,
  createdAt: new Date(pub.published_at).getTime(),
  updatedAt: new Date(pub.published_at).getTime(),
  uploadedAt: null,
  downloadedAt: null,
});

export const usePublicBooks = (): { books: Book[]; loading: boolean } => {
  const [publicBooks, setPublicBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const books = await listPublicBookShelf();
        if (cancelled) return;
        setPublicBooks(books.map((pub) => publicBookToBook(pub)));
      } catch {
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { books: publicBooks, loading };
};

// Given a book whose url starts with "__public__", resolve the real download URL.
export const resolvePublicBookUrl = async (book: Book): Promise<string | null> => {
  if (!book.url?.startsWith('__public__')) return null;
  const [id] = book.url.replace('__public__', '').split(':');
  if (!id) return null;
  try {
    return await getPublicBookDownloadUrl(id);
  } catch {
    return null;
  }
};

export const isPublicBook = (book: Book): boolean => !!book.url?.startsWith('__public__');
