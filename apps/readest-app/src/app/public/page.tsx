'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';
import { useAuth } from '@/context/AuthContext';
import { useEnv } from '@/context/EnvContext';
import { useLibrary } from '@/hooks/useLibrary';
import { useLibraryStore } from '@/store/libraryStore';
import { useTranslation } from '@/hooks/useTranslation';
import {
  listPublicBooks,
  getPublicBookDownloadUrl,
  type PublicBook,
  type ListPublicBooksResponse,
} from '@/libs/publicBooks';
import { eventDispatcher } from '@/utils/event';
import { navigateToLogin } from '@/utils/nav';

// Format badge color mapping
const FORMAT_COLORS: Record<string, string> = {
  epub: 'bg-emerald-100 text-emerald-700',
  pdf: 'bg-rose-100 text-rose-700',
  mobi: 'bg-amber-100 text-amber-700',
  azw3: 'bg-purple-100 text-purple-700',
};

const BookCard = ({
  book,
  pending,
  onDownload,
  onImport,
  canImport,
}: {
  book: PublicBook;
  pending: boolean;
  onDownload: () => void;
  onImport: () => void;
  canImport: boolean;
}) => {
  const _ = useTranslation();
  const fmt = (book.format || '').toLowerCase();
  const fmtClass = FORMAT_COLORS[fmt] || 'bg-base-200 text-base-content/60';

  return (
    <div className='border-base-200 bg-base-100 group relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg'>
      {/* Cover */}
      <div className='from-base-200 to-base-300 relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br'>
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title || '封面'}
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
          />
        ) : (
          <div className='flex h-full w-full flex-col items-center justify-center gap-2 p-4'>
            <span className='text-4xl opacity-20'>📖</span>
            <span className='text-base-content/40 line-clamp-3 text-center text-xs'>
              {book.title || '未知书名'}
            </span>
          </div>
        )}
        {/* Format badge */}
        {book.format && (
          <span
            className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${fmtClass}`}
          >
            {book.format}
          </span>
        )}
      </div>

      {/* Info */}
      <div className='flex flex-1 flex-col gap-1 p-3'>
        <h3 className='text-base-content line-clamp-2 text-sm font-semibold leading-snug'>
          {book.title || _('Untitled')}
        </h3>
        <p className='text-base-content/55 truncate text-xs'>
          {book.author || _('Unknown Author')}
        </p>
        <p className='text-base-content/35 mt-auto pt-1 text-[10px]'>
          {new Date(book.published_at).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Actions */}
      <div className='border-base-200 grid grid-cols-2 gap-1.5 border-t p-2'>
        <button
          className='btn btn-xs btn-ghost rounded-lg text-xs'
          onClick={onDownload}
          disabled={pending}
        >
          {pending ? <span className='loading loading-spinner loading-xs' /> : _('Download')}
        </button>
        <button
          className='btn btn-xs btn-primary rounded-lg text-xs'
          onClick={onImport}
          disabled={pending || !canImport}
          title={!canImport ? _('Sign in to import') : undefined}
        >
          {pending ? <span className='loading loading-spinner loading-xs' /> : _('Import')}
        </button>
      </div>
    </div>
  );
};

const PublicBooksPage = () => {
  const _ = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { appService } = useEnv();
  const { libraryLoaded } = useLibrary();
  const { library, setLibrary } = useLibraryStore();
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingBookId, setPendingBookId] = useState<string | null>(null);

  const loadBooks = async (currentPage: number, currentSearch: string) => {
    setLoading(true);
    try {
      const response: ListPublicBooksResponse = await listPublicBooks({
        page: currentPage,
        pageSize: 20,
        search: currentSearch,
      });
      setBooks(response.books);
      setTotalPages(response.totalPages);
    } catch (error) {
      eventDispatcher.dispatch('toast', {
        type: 'info',
        message: error instanceof Error ? error.message : _('Failed to load public books'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks(page, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleDownload = async (bookId: string) => {
    setPendingBookId(bookId);
    try {
      const downloadUrl = await getPublicBookDownloadUrl(bookId);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      eventDispatcher.dispatch('toast', {
        type: 'info',
        message: error instanceof Error ? error.message : _('Failed to get download link'),
      });
    } finally {
      setPendingBookId(null);
    }
  };

  const handleImport = async (book: PublicBook) => {
    if (!user) {
      navigateToLogin(router);
      return;
    }
    if (!appService || !libraryLoaded) return;
    setPendingBookId(book.id);
    try {
      const downloadUrl = await getPublicBookDownloadUrl(book.id);
      const imported = await appService.importBook(downloadUrl, library);
      if (imported) {
        const nextLibrary = [...library];
        const existing = nextLibrary.findIndex((item) => item.hash === imported.hash);
        if (existing >= 0) {
          nextLibrary[existing] = imported;
        } else {
          nextLibrary.unshift(imported);
        }
        setLibrary(nextLibrary);
        await appService.saveLibraryBooks(nextLibrary);
        eventDispatcher.dispatch('toast', {
          type: 'info',
          message: _('Imported to your library'),
        });
      }
    } catch (error) {
      eventDispatcher.dispatch('toast', {
        type: 'info',
        message: error instanceof Error ? error.message : _('Failed to import public book'),
      });
    } finally {
      setPendingBookId(null);
    }
  };

  return (
    <div className='bg-base-200/40 min-h-screen'>
      {/* Hero header */}
      <header className='relative overflow-hidden bg-gradient-to-br from-emerald-900 via-teal-800 to-emerald-700 px-6 py-10 sm:py-14'>
        <div
          className='pointer-events-none absolute inset-0 opacity-10'
          style={{
            backgroundImage: 'radial-gradient(circle at 70% 50%, #fff 0%, transparent 60%)',
          }}
        />
        <div className='relative mx-auto max-w-5xl'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <div className='mb-1 flex items-center gap-2'>
                <span className='text-2xl'>🪷</span>
                <h1
                  className='text-2xl font-bold tracking-wide text-white sm:text-3xl'
                  style={{
                    fontFamily: '"Noto Serif SC", "STSong", Georgia, serif',
                    letterSpacing: '0.1em',
                  }}
                >
                  公共书架
                </h1>
              </div>
              <p className='text-sm text-emerald-200/80'>社区共享书目，无需登录即可浏览与下载</p>
            </div>
            <div className='flex gap-2'>
              {!user ? (
                <button
                  className='btn btn-sm border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20'
                  onClick={() => navigateToLogin(router)}
                >
                  登录账号
                </button>
              ) : null}
              <Link
                className='btn btn-sm border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20'
                href='/library'
              >
                我的书库
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <form className='mt-6 flex gap-2' onSubmit={handleSearchSubmit}>
            <div className='relative flex-1'>
              <span className='pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/40'>
                🔍
              </span>
              <input
                type='text'
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder='搜索书名或作者…'
                className='w-full rounded-xl border border-white/20 bg-white/10 py-2 pl-9 pr-4 text-sm text-white placeholder-white/40 backdrop-blur focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20'
              />
            </div>
            <button
              className='rounded-xl border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20 focus:outline-none'
              type='submit'
            >
              搜索
            </button>
          </form>
        </div>
      </header>

      {/* Main content */}
      <main className='mx-auto max-w-5xl px-4 py-8 sm:px-6'>
        {loading ? (
          <div className='flex items-center justify-center py-24'>
            <Spinner loading />
          </div>
        ) : books.length === 0 ? (
          <div className='text-base-content/40 flex flex-col items-center justify-center gap-4 py-24'>
            <span className='text-5xl'>📭</span>
            <p className='text-sm'>{search ? '未找到相关书目' : '暂无公共书目'}</p>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                pending={pendingBookId === book.id}
                onDownload={() => handleDownload(book.id)}
                onImport={() => handleImport(book)}
                canImport={!!appService && libraryLoaded}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='mt-10 flex items-center justify-center gap-3'>
            <button
              className='btn btn-sm btn-ghost rounded-xl'
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← 上一页
            </button>
            <span className='text-base-content/50 text-sm'>
              第 {page} / {totalPages} 页
            </span>
            <button
              className='btn btn-sm btn-ghost rounded-xl'
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页 →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicBooksPage;
