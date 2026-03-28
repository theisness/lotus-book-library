import { useEffect, useRef, useState } from 'react';
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
  // Logged-in users see a "公共书架" group; guests see books ungrouped
  groupName: isLoggedIn ? PUBLIC_BOOKS_GROUP_NAME : undefined,
  groupId: undefined,
  url: `__public__${pub.id}`,
  createdAt: new Date(pub.published_at).getTime(),
  updatedAt: new Date(pub.published_at).getTime(),
  uploadedAt: null,
  downloadedAt: null,
});

export const usePublicBooks = (isLoggedIn: boolean) => {
  const [publicBooks, setPublicBooks] = useState<Book[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const load = async () => {
      try {
        // Load first two pages (up to 40 books) for the library view
        const [page1, page2] = await Promise.allSettled([
          listPublicBooks({ page: 1, pageSize: 20 }),
          listPublicBooks({ page: 2, pageSize: 20 }),
        ]);
        const books: PublicBook[] = [];
        if (page1.status === 'fulfilled') books.push(...page1.value.books);
        if (page2.status === 'fulfilled') books.push(...page2.value.books);
        setPublicBooks(books.map((pub) => publicBookToBook(pub, isLoggedIn)));
      } catch {
        // silently fail — public books are optional
      }
    };

    load();
  }, [isLoggedIn]);

  return publicBooks;
};

// Given a book whose url starts with "__public__", resolve the real download URL.
export const resolvePublicBookUrl = async (book: Book): Promise<string | null> => {
  if (!book.url?.startsWith('__public__')) return null;
  const id = book.url.replace('__public__', '');
  try {
    return await getPublicBookDownloadUrl(id);
  } catch {
    return null;
  }
};

export const isPublicBook = (book: Book): boolean => !!book.url?.startsWith('__public__');
