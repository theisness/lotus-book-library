import clsx from 'clsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCheck, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActivityFeed } from '../hooks/useActivityFeed';
import { useTranslation } from '@/hooks/useTranslation';
import { useEnv } from '@/context/EnvContext';
import { navigateToReader } from '@/utils/nav';
import {
  listPublicBookShelf,
  getPublicBookDownloadUrl,
  fetchAdminNotesForPublicBook,
} from '@/libs/publicBooks';
import { useLibraryStore } from '@/store/libraryStore';
import { useBookDataStore } from '@/store/bookDataStore';
import type { ActivityRecord } from '@/types/public-bookshelf';
import type { PublicBook } from '@/libs/publicBooks';
import ActivityFeedItem from './ActivityFeedItem';

const READ_IDS_KEY = 'activity-feed-read-ids';
const CLEARED_AT_KEY = 'activity-feed-cleared-at';

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function getClearedAt(): number {
  try {
    const raw = localStorage.getItem(CLEARED_AT_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function saveClearedAt(ts: number) {
  try {
    localStorage.setItem(CLEARED_AT_KEY, String(ts));
  } catch {
    // ignore
  }
}

interface MessageBoxPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MessageBoxPanel: React.FC<MessageBoxPanelProps> = ({ isOpen, onClose }) => {
  const _ = useTranslation();
  const router = useRouter();
  const { appService } = useEnv();
  const panelRef = useRef<HTMLDivElement>(null);
  const { activities, loading, error, hasMore, loadMore } = useActivityFeed();
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const [clearedAt, setClearedAt] = useState<number>(getClearedAt);
  const [navigating, setNavigating] = useState(false);
  const publicBooksRef = useRef<PublicBook[] | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    listPublicBookShelf()
      .then((books) => {
        publicBooksRef.current = books;
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && activities.length === 0 && !loading && !error) {
      loadMore();
    }
  }, [isOpen, activities.length, loading, error, loadMore]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const handleClickItem = useCallback(
    async (activity: ActivityRecord) => {
      markRead(activity.id);

      if (activity.action === 'book_unpublished') return;

      const publicBooks = publicBooksRef.current;
      if (!publicBooks || !appService) return;

      const pub = publicBooks.find((b) => b.book_hash === activity.target_book_hash);
      if (!pub) return;

      setNavigating(true);
      try {
        // Download the book file via presigned URL
        const downloadUrl = await getPublicBookDownloadUrl(pub.id);
        if (!downloadUrl) return;

        const dlResponse = await fetch(downloadUrl);
        if (!dlResponse.ok) return;

        const blob = await dlResponse.blob();
        const ext = pub.format?.toLowerCase() || 'epub';
        const bookFile = new File([blob], `${pub.title || pub.id}.${ext}`, { type: blob.type });

        // Use public-{id} as the stable hash for navigation (survives refresh)
        const publicHash = `public-${pub.id}`;
        const publicBook = {
          hash: publicHash,
          format: (pub.format?.toUpperCase() as 'EPUB' | 'PDF') || 'EPUB',
          title: pub.title || '',
          author: pub.author || '',
          coverImageUrl: pub.coverUrl || null,
          url: `__public__${pub.id}:${pub.book_hash}`,
          createdAt: new Date(pub.published_at).getTime(),
          updatedAt: new Date(pub.published_at).getTime(),
          uploadedAt: null,
          downloadedAt: null,
        };

        // Fetch admin's notes
        let adminNotes: Array<{
          id: string;
          type: string;
          cfi: string;
          text?: string;
          style?: string;
          color?: string;
          note?: string;
          created_at: string;
          updated_at: string;
        }> = [];
        try {
          adminNotes = await fetchAdminNotesForPublicBook(pub.book_hash);
        } catch {
          // ignore
        }

        const booknotes = adminNotes.map((n) => ({
          id: n.id,
          type: n.type as 'bookmark' | 'annotation' | 'excerpt',
          cfi: n.cfi,
          text: n.text || '',
          style: n.style,
          color: n.color,
          note: n.note || '',
          createdAt: new Date(n.created_at).getTime(),
          updatedAt: new Date(n.updated_at).getTime(),
        }));

        // Add to library store
        const { library, setLibrary } = useLibraryStore.getState();
        const existingIdx = library.findIndex((b) => b.hash === publicHash);
        if (existingIdx >= 0) {
          library[existingIdx] = publicBook;
          setLibrary([...library]);
        } else {
          setLibrary([...library, publicBook]);
        }

        // Store file and config in bookDataStore
        useBookDataStore.setState((state) => ({
          booksData: {
            ...state.booksData,
            [publicHash]: {
              id: publicHash,
              book: publicBook,
              file: bookFile,
              config:
                booknotes.length > 0
                  ? { ...(state.booksData[publicHash]?.config || {}), booknotes }
                  : state.booksData[publicHash]?.config || null,
              bookDoc: state.booksData[publicHash]?.bookDoc || null,
              isFixedLayout: state.booksData[publicHash]?.isFixedLayout || false,
            },
          },
        }));

        onClose();

        // Navigate using the stable public hash
        if (activity.action === 'note_added') {
          navigateToReader(router, [publicHash], 'annotations=true');
        } else {
          navigateToReader(router, [publicHash]);
        }
      } catch {
        // ignore navigation errors
      } finally {
        setNavigating(false);
      }
    },
    [markRead, onClose, router, appService],
  );

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const a of visibleActivities) {
        next.add(a.id);
      }
      saveReadIds(next);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, clearedAt]);

  const clearAll = useCallback(() => {
    const now = Date.now();
    setClearedAt(now);
    saveClearedAt(now);
    setReadIds(new Set());
    saveReadIds(new Set());
  }, []);

  if (!isOpen) return null;

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const visibleActivities = clearedAt
    ? sortedActivities.filter((a) => new Date(a.created_at).getTime() > clearedAt)
    : sortedActivities;

  const unreadCount = visibleActivities.filter((a) => !readIds.has(a.id)).length;

  return (
    <div
      ref={panelRef}
      role='dialog'
      aria-label={_('Messages')}
      className={clsx(
        'bg-base-100 border-base-300 absolute right-0 top-full z-50 mt-2',
        'w-80 rounded-xl border shadow-lg',
        'max-h-96 overflow-y-auto',
      )}
    >
      <div className='border-base-300 flex items-center justify-between border-b px-4 py-3'>
        <h3 className='text-base-content text-sm font-semibold'>{_('Messages')}</h3>
        {visibleActivities.length > 0 && (
          <div className='flex items-center gap-1'>
            {unreadCount > 0 && (
              <button
                type='button'
                onClick={markAllRead}
                title={_('Mark All Read')}
                className='btn btn-ghost h-6 min-h-6 w-6 p-0'
              >
                <CheckCheck className='text-base-content/50 hover:text-base-content h-3.5 w-3.5' />
              </button>
            )}
            <button
              type='button'
              onClick={clearAll}
              title={_('Clear All')}
              className='btn btn-ghost h-6 min-h-6 w-6 p-0'
            >
              <Trash2 className='text-base-content/50 hover:text-error h-3.5 w-3.5' />
            </button>
          </div>
        )}
      </div>

      <div className='p-2'>
        {(navigating || (loading && activities.length === 0)) && (
          <div className='flex justify-center py-8'>
            <span className='loading loading-dots loading-md text-base-content/50'></span>
          </div>
        )}

        {error && !navigating && (
          <div className='text-error px-3 py-4 text-center text-sm'>{_('Failed to load')}</div>
        )}

        {!loading && !error && !navigating && visibleActivities.length === 0 && (
          <div className='text-base-content/50 px-3 py-8 text-center text-sm'>
            {_('No messages yet')}
          </div>
        )}

        {!navigating &&
          visibleActivities.map((activity) => (
            <ActivityFeedItem
              key={activity.id}
              activity={activity}
              isRead={readIds.has(activity.id)}
              onClickItem={handleClickItem}
            />
          ))}

        {hasMore && visibleActivities.length > 0 && !navigating && (
          <button
            type='button'
            onClick={loadMore}
            disabled={loading}
            className={clsx(
              'text-base-content/60 hover:text-base-content w-full py-2 text-center text-xs',
              'hover:bg-base-200 rounded-lg transition-colors',
              loading && 'cursor-not-allowed opacity-50',
            )}
          >
            {loading ? _('Loading...') : _('Load More')}
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBoxPanel;
