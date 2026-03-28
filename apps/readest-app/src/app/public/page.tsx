'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
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
  listMyPublishedBooksDetail,
  unpublishPublicBook,
  publishPublicBook,
  getPublicBookDownloadUrl,
  type PublicBook,
  type ListPublicBooksResponse,
} from '@/libs/publicBooks';
import { eventDispatcher } from '@/utils/event';
import { navigateToLogin, navigateToReader } from '@/utils/nav';
import { Toast } from '@/components/Toast';

// ── Format badge ──────────────────────────────────────────────────────────────

const FORMAT_META: Record<string, { bg: string; text: string }> = {
  epub: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  pdf: { bg: 'bg-rose-100', text: 'text-rose-700' },
  mobi: { bg: 'bg-amber-100', text: 'text-amber-700' },
  azw3: { bg: 'bg-purple-100', text: 'text-purple-700' },
  cbz: { bg: 'bg-sky-100', text: 'text-sky-700' },
  fb2: { bg: 'bg-pink-100', text: 'text-pink-700' },
};

const FormatBadge = ({ format }: { format: string | null }) => {
  if (!format) return null;
  const fmt = format.toLowerCase();
  const meta = FORMAT_META[fmt] ?? { bg: 'bg-base-200', text: 'text-base-content/60' };
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.bg} ${meta.text}`}
    >
      {format.toUpperCase()}
    </span>
  );
};

// ── BookCard ──────────────────────────────────────────────────────────────────

interface BookCardProps {
  book: PublicBook;
  pending: boolean;
  isOwner: boolean;
  canRead: boolean;
  selectMode: boolean;
  selected: boolean;
  onDownload: () => void;
  onRead: () => void;
  onUnpublish: () => void;
  onSelect: () => void;
}

const BookCard = ({
  book,
  pending,
  isOwner,
  canRead,
  selectMode,
  selected,
  onDownload,
  onRead,
  onUnpublish,
  onSelect,
}: BookCardProps) => {
  const _ = useTranslation();
  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        selected ? 'border-emerald-500 ring-2 ring-emerald-400/60' : 'border-base-200 bg-base-100'
      }`}
      onClick={selectMode ? onSelect : !pending && canRead ? onRead : undefined}
      style={{ cursor: selectMode ? 'pointer' : canRead && !pending ? 'pointer' : 'default' }}
    >
      {selectMode && (
        <div className='absolute left-2 top-2 z-10'>
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
              selected ? 'border-emerald-500 bg-emerald-500' : 'border-white/70 bg-black/25'
            }`}
          >
            {selected && (
              <svg
                className='h-3 w-3 text-white'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={3}
                  d='M5 13l4 4L19 7'
                />
              </svg>
            )}
          </div>
        </div>
      )}
      <div className='from-base-200 to-base-300 relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br'>
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title ?? '封面'}
            className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-105'
            draggable={false}
          />
        ) : (
          <div className='flex h-full w-full flex-col items-center justify-center gap-2 p-4'>
            <span className='text-4xl opacity-20'>📖</span>
            <span className='text-base-content/40 line-clamp-3 text-center text-xs'>
              {book.title ?? '未知书名'}
            </span>
          </div>
        )}
        {/* Read overlay hint */}
        {!selectMode && canRead && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-200 group-hover:bg-black/30'>
            <div className='flex scale-75 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 opacity-0 shadow transition-all duration-200 group-hover:scale-100 group-hover:opacity-100'>
              <svg className='h-3.5 w-3.5 text-emerald-700' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z' />
              </svg>
              <span className='text-xs font-semibold text-emerald-800'>点击阅读</span>
            </div>
          </div>
        )}
        <div className='absolute right-2 top-2'>
          <FormatBadge format={book.format} />
        </div>
        {isOwner && !selectMode && (
          <div className='absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-900/75 to-transparent px-2 py-1.5'>
            <span className='text-[10px] font-medium text-emerald-200'>我发布的</span>
          </div>
        )}
      </div>
      <div className='flex flex-1 flex-col gap-1 p-3'>
        <h3 className='text-base-content line-clamp-2 text-sm font-semibold leading-snug'>
          {book.title ?? _('Untitled')}
        </h3>
        <p className='text-base-content/55 truncate text-xs'>
          {book.author ?? _('Unknown Author')}
        </p>
        <p className='text-base-content/35 mt-auto pt-1 text-[10px]'>
          {new Date(book.published_at).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>
      {!selectMode && (
        <div className='border-base-200 flex gap-1.5 border-t p-2'>
          <button
            className='btn btn-xs btn-ghost flex-1 rounded-lg text-xs'
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            disabled={pending}
            title='下载到本地'
          >
            {pending ? <span className='loading loading-spinner loading-xs' /> : '⬇ 下载'}
          </button>
          {isOwner && (
            <button
              className='btn btn-xs btn-error btn-outline rounded-lg text-xs'
              onClick={(e) => {
                e.stopPropagation();
                onUnpublish();
              }}
              disabled={pending}
              title='从公共书架下架'
            >
              {pending ? <span className='loading loading-spinner loading-xs' /> : '下架'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── PublishFromLibraryModal ───────────────────────────────────────────────────

const PublishFromLibraryModal = ({
  onClose,
  onPublished,
  alreadyPublishedHashes,
}: {
  onClose: () => void;
  onPublished: (book: PublicBook) => void;
  alreadyPublishedHashes: Set<string>;
}) => {
  const { library } = useLibraryStore();
  const [search, setSearch] = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);

  const uploadedBooks = library.filter((b) => !b.deletedAt && b.uploadedAt);
  const filtered = uploadedBooks.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q);
  });

  const handlePublish = async (bookHash: string) => {
    setPublishing(bookHash);
    try {
      const newBook = await publishPublicBook(bookHash);
      onPublished(newBook);
      eventDispatcher.dispatch('toast', {
        type: 'success',
        message: '已发布到公共书架',
        timeout: 2500,
      });
    } catch (e) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: e instanceof Error ? e.message : '发布失败',
      });
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'>
      <div className='bg-base-100 flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl'>
        <div className='border-base-200 flex items-center justify-between border-b px-5 py-4'>
          <div>
            <h2 className='text-base-content text-lg font-bold'>发布到公共书架</h2>
            <p className='text-base-content/50 mt-0.5 text-xs'>从已上传的云端书籍中选择发布</p>
          </div>
          <button className='btn btn-ghost btn-sm btn-circle' onClick={onClose}>
            <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>
        <div className='border-base-200 border-b px-5 py-3'>
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='搜索书名或作者…'
            className='input input-bordered input-sm w-full'
            autoFocus
          />
        </div>
        <div className='flex-1 overflow-y-auto'>
          {uploadedBooks.length === 0 ? (
            <div className='flex flex-col items-center justify-center gap-3 py-12 text-center'>
              <span className='text-4xl opacity-30'>☁️</span>
              <p className='text-base-content/40 text-sm'>暂无已上传到云端的书籍</p>
              <p className='text-base-content/30 text-xs'>请先在书库页面将书籍上传到云端</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className='flex items-center justify-center py-10'>
              <p className='text-base-content/40 text-sm'>未找到匹配的书籍</p>
            </div>
          ) : (
            <ul className='divide-base-200 divide-y'>
              {filtered.map((book) => {
                const published = alreadyPublishedHashes.has(book.hash);
                const isPending = publishing === book.hash;
                return (
                  <li
                    key={book.hash}
                    className='hover:bg-base-200/40 flex items-center gap-3 px-5 py-3 transition-colors'
                  >
                    <div className='from-base-200 to-base-300 h-12 w-9 flex-shrink-0 overflow-hidden rounded bg-gradient-to-br'>
                      {book.coverImageUrl ? (
                        <img
                          src={book.coverImageUrl}
                          alt=''
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center'>
                          <span className='text-base-content/20 text-xs'>📖</span>
                        </div>
                      )}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='text-base-content truncate text-sm font-semibold'>
                        {book.title || '无标题'}
                      </p>
                      <p className='text-base-content/50 truncate text-xs'>
                        {book.author || '未知作者'}
                      </p>
                    </div>
                    <div className='flex flex-shrink-0 items-center gap-2'>
                      <FormatBadge format={book.format ?? null} />
                      {published ? (
                        <span className='flex items-center gap-1 text-xs font-medium text-emerald-600'>
                          <svg className='h-3.5 w-3.5' fill='currentColor' viewBox='0 0 20 20'>
                            <path
                              fillRule='evenodd'
                              d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                              clipRule='evenodd'
                            />
                          </svg>
                          已发布
                        </span>
                      ) : (
                        <button
                          className='btn btn-xs btn-primary rounded-lg'
                          onClick={() => handlePublish(book.hash)}
                          disabled={!!publishing}
                        >
                          {isPending ? (
                            <span className='loading loading-spinner loading-xs' />
                          ) : (
                            '发布'
                          )}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className='border-base-200 flex justify-end border-t px-5 py-3'>
          <button className='btn btn-sm btn-ghost rounded-xl' onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

// ── UnpublishConfirmModal ─────────────────────────────────────────────────────

const UnpublishConfirmModal = ({
  books,
  onCancel,
  onConfirm,
  loading,
}: {
  books: PublicBook[];
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => (
  <div className='fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center'>
    <div className='bg-base-100 w-full max-w-sm rounded-2xl p-6 shadow-2xl'>
      <h3 className='text-base-content mb-2 text-base font-bold'>
        确认下架 {books.length > 1 ? `${books.length} 本书` : `《${books[0]?.title ?? '未知'}》`}？
      </h3>
      <p className='text-base-content/50 mb-5 text-sm'>
        下架后其他用户将无法在公共书架中找到{books.length > 1 ? '这些书籍' : '这本书'}。
      </p>
      <div className='flex gap-3'>
        <button
          className='btn btn-sm btn-ghost flex-1 rounded-xl'
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </button>
        <button
          className='btn btn-sm btn-error flex-1 rounded-xl'
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <span className='loading loading-spinner loading-xs' /> : '确认下架'}
        </button>
      </div>
    </div>
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabType = 'all' | 'mine';

const PublicBooksPage = () => {
  const router = useRouter();
  const { user, token } = useAuth();
  const { appService } = useEnv();
  const { libraryLoaded } = useLibrary();
  const { library, setLibrary } = useLibraryStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [myBooks, setMyBooks] = useState<PublicBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [myBooksLoading, setMyBooksLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [pendingBookId, setPendingBookId] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [unpublishTargets, setUnpublishTargets] = useState<PublicBook[]>([]);
  const [unpublishing, setUnpublishing] = useState(false);

  const myBookHashes = new Set(myBooks.map((b) => b.book_hash));
  const isLoggedIn = !!user && !!token;

  const loadAll = useCallback(async (p: number, q: string, fmt: string) => {
    setLoading(true);
    try {
      const res: ListPublicBooksResponse = await listPublicBooks({
        page: p,
        pageSize: 20,
        search: q,
        format: fmt || undefined,
      });
      setBooks(res.books);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch (e) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: e instanceof Error ? e.message : '加载失败',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    if (!isLoggedIn) return;
    setMyBooksLoading(true);
    try {
      const data = await listMyPublishedBooksDetail();
      setMyBooks(data);
    } catch (e) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: e instanceof Error ? e.message : '加载我的书籍失败',
      });
    } finally {
      setMyBooksLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    loadAll(page, search, formatFilter);
  }, [page, search, formatFilter, loadAll]);
  useEffect(() => {
    if (isLoggedIn) loadMine();
  }, [isLoggedIn, loadMine]);
  useEffect(() => {
    setPage(1);
  }, [search, formatFilter]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectMode(false);
    setSelectedIds(new Set());
    if (tab === 'mine' && myBooks.length === 0) loadMine();
  };

  const handleDownload = async (book: PublicBook) => {
    setPendingBookId(book.id);
    try {
      const url = await getPublicBookDownloadUrl(book.id);
      // 用书名作为下载文件名
      const ext = book.format ? `.${book.format.toLowerCase()}` : '';
      const safeName = (book.title || 'book').replace(/[\\/:*?"\u003c>|]/g, '_');
      const filename = `${safeName}${ext}`;
      const resp = await fetch(url);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: e instanceof Error ? e.message : '获取下载链接失败',
      });
    } finally {
      setPendingBookId(null);
    }
  };

  const handleRead = async (book: PublicBook) => {
    if (!user) {
      navigateToLogin(router);
      return;
    }
    if (!appService || !libraryLoaded) return;
    setPendingBookId(book.id);
    try {
      const url = await getPublicBookDownloadUrl(book.id);
      const imported = await appService.importBook(url, library);
      if (imported) {
        const next = [...library];
        const idx = next.findIndex((b) => b.hash === imported.hash);
        if (idx >= 0) next[idx] = imported;
        else next.unshift(imported);
        setLibrary(next);
        await appService.saveLibraryBooks(next);
        navigateToReader(router, [imported.hash]);
      }
    } catch (e) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: e instanceof Error ? e.message : '打开失败',
      });
    } finally {
      setPendingBookId(null);
    }
  };

  const requestUnpublish = (book: PublicBook) => setUnpublishTargets([book]);
  const requestBatchUnpublish = () => {
    const targets = myBooks.filter((b) => selectedIds.has(b.id));
    if (targets.length) setUnpublishTargets(targets);
  };

  const confirmUnpublish = async () => {
    setUnpublishing(true);
    try {
      await Promise.all(unpublishTargets.map((b) => unpublishPublicBook(b.book_hash)));
      const removedHashes = new Set(unpublishTargets.map((b) => b.book_hash));
      setMyBooks((prev) => prev.filter((b) => !removedHashes.has(b.book_hash)));
      setBooks((prev) => prev.filter((b) => !removedHashes.has(b.book_hash)));
      setSelectedIds(new Set());
      setSelectMode(false);
      eventDispatcher.dispatch('toast', {
        type: 'success',
        message: `已下架 ${unpublishTargets.length} 本书`,
        timeout: 2000,
      });
    } catch (e) {
      eventDispatcher.dispatch('toast', {
        type: 'error',
        message: e instanceof Error ? e.message : '下架失败',
      });
    } finally {
      setUnpublishing(false);
      setUnpublishTargets([]);
    }
  };

  const handlePublished = (book: PublicBook) => {
    setMyBooks((prev) => [book, ...prev.filter((b) => b.book_hash !== book.book_hash)]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const displayBooks = activeTab === 'mine' ? myBooks : books;

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
          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
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
            <div className='flex flex-wrap gap-2'>
              {isLoggedIn ? (
                <button
                  className='btn btn-sm border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20'
                  onClick={() => setShowPublishModal(true)}
                >
                  <svg
                    className='mr-1 h-4 w-4'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 4v16m8-8H4'
                    />
                  </svg>
                  发布书籍
                </button>
              ) : (
                <button
                  className='btn btn-sm border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20'
                  onClick={() => navigateToLogin(router)}
                >
                  登录账号
                </button>
              )}
              <Link
                className='btn btn-sm border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20'
                href='/library'
              >
                我的书库
              </Link>
            </div>
          </div>

          {/* Search + filter row */}
          <form className='mt-6 flex flex-wrap gap-2' onSubmit={handleSearchSubmit}>
            <div className='relative min-w-0 flex-1'>
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
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              className='rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur focus:outline-none'
            >
              <option value=''>全部格式</option>
              {['epub', 'pdf', 'mobi', 'azw3'].map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
            <button
              type='submit'
              className='rounded-xl border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20 focus:outline-none'
            >
              搜索
            </button>
          </form>

          {/* Tabs (only for logged-in users) */}
          {isLoggedIn && (
            <div className='mt-5 flex gap-1'>
              {(['all', 'mine'] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-white text-emerald-800 shadow'
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  {tab === 'all'
                    ? `全部书目${total ? ` (${total})` : ''}`
                    : `我发布的${myBooks.length ? ` (${myBooks.length})` : ''}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className='mx-auto max-w-5xl px-4 py-8 sm:px-6'>
        {/* Select mode toolbar (mine tab only) */}
        {activeTab === 'mine' && myBooks.length > 0 && (
          <div className='mb-4 flex items-center justify-between'>
            {selectMode ? (
              <>
                <span className='text-base-content/60 text-sm'>已选 {selectedIds.size} 本</span>
                <div className='flex gap-2'>
                  {selectedIds.size > 0 && (
                    <button
                      className='btn btn-xs btn-error rounded-xl'
                      onClick={requestBatchUnpublish}
                    >
                      批量下架
                    </button>
                  )}
                  <button className='btn btn-xs btn-ghost rounded-xl' onClick={exitSelectMode}>
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className='text-base-content/50 text-sm'>共 {myBooks.length} 本已发布</span>
                <button
                  className='btn btn-xs btn-ghost rounded-xl'
                  onClick={() => setSelectMode(true)}
                >
                  多选管理
                </button>
              </>
            )}
          </div>
        )}

        {/* Book grid */}
        {(activeTab === 'mine' ? myBooksLoading : loading) ? (
          <div className='flex items-center justify-center py-24'>
            <Spinner loading />
          </div>
        ) : displayBooks.length === 0 ? (
          <div className='text-base-content/40 flex flex-col items-center justify-center gap-4 py-24'>
            <span className='text-5xl'>{activeTab === 'mine' ? '🌱' : '📭'}</span>
            <p className='text-sm'>
              {activeTab === 'mine'
                ? '你还没有发布任何书籍'
                : search
                  ? '未找到相关书目'
                  : '暂无公共书目'}
            </p>
            {activeTab === 'mine' && (
              <button
                className='btn btn-sm btn-primary mt-1 rounded-xl'
                onClick={() => setShowPublishModal(true)}
              >
                去发布书籍
              </button>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
            {displayBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                pending={pendingBookId === book.id}
                isOwner={myBookHashes.has(book.book_hash)}
                canRead={!!appService && libraryLoaded && !!user}
                selectMode={selectMode && activeTab === 'mine'}
                selected={selectedIds.has(book.id)}
                onDownload={() => handleDownload(book)}
                onRead={() => handleRead(book)}
                onUnpublish={() => requestUnpublish(book)}
                onSelect={() => toggleSelect(book.id)}
              />
            ))}
          </div>
        )}

        {/* Pagination (all tab only) */}
        {activeTab === 'all' && totalPages > 1 && (
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

      {/* Modals */}
      {showPublishModal && (
        <PublishFromLibraryModal
          onClose={() => setShowPublishModal(false)}
          onPublished={handlePublished}
          alreadyPublishedHashes={myBookHashes}
        />
      )}
      {unpublishTargets.length > 0 && (
        <UnpublishConfirmModal
          books={unpublishTargets}
          onCancel={() => setUnpublishTargets([])}
          onConfirm={confirmUnpublish}
          loading={unpublishing}
        />
      )}
      <Toast />
    </div>
  );
};

export default PublicBooksPage;
