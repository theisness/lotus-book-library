import { useEffect, useState } from 'react';
import { Book } from '@/types/book';
import { listPublicBooks, getPublicBookDownloadUrl, type PublicBook } from '@/libs/publicBooks';

export const PUBLIC_BOOKS_GROUP_NAME = '公共书架';

// Convert a PublicBook from the public API into a library-compatible Book object.
const publicBookToBook = (pub: PublicBook, isLoggedIn: boolean): Book => ({
  hash: `public-${pub.id}`,
  format: (pub.format?.toUpperCase() as Book['format']) || 'EPUB',
  title: pub.title || '未知书名',
  author: pub.author || '',
  coverImageUrl: pub.coverUrl || null,
  groupName: isLoggedIn ? PUBLIC_BOOKS_GROUP_NAME : undefined,
  groupId: undefined,
  url: `__public__${pub.id}:${pub.book_hash}`,
  createdAt: new Date(pub.published_at).getTime(),
  updatedAt: new Date(pub.published_at).getTime(),
  uploadedAt: null,
  downloadedAt: null,
});

export const usePublicBooks = (isLoggedIn: boolean): { books: Book[]; loading: boolean } => {
  const [publicBooks, setPublicBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const page1Result = await listPublicBooks({ page: 1, pageSize: 20 });
        if (cancelled) return;
        const books: PublicBook[] = [...page1Result.books];
        if (page1Result.totalPages > 1) {
          const page2Result = await listPublicBooks({ page: 2, pageSize: 20 }).catch(() => null);
          if (cancelled) return;
          if (page2Result) books.push(...page2Result.books);
        }
        setPublicBooks(books.map((pub) => publicBookToBook(pub, isLoggedIn)));
      } catch {
        // silently fail — public books are optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

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
