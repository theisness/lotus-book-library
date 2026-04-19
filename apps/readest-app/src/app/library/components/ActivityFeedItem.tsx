import clsx from 'clsx';
import React from 'react';
import { BookPlus, BookUp, BookX, MessageSquarePlus } from 'lucide-react';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';
import type { ActivityRecord } from '@/types/public-bookshelf';

interface ActivityFeedItemProps {
  activity: ActivityRecord;
  isRead?: boolean;
  onClickItem?: (activity: ActivityRecord) => void;
}

const actionConfig: Record<
  ActivityRecord['action'],
  {
    icon: React.FC<{ className?: string }>;
    labelKey: string;
    colorClass: string;
  }
> = {
  book_published: {
    icon: BookPlus,
    labelKey: 'published a book',
    colorClass: 'text-success',
  },
  book_updated: {
    icon: BookUp,
    labelKey: 'updated a book',
    colorClass: 'text-info',
  },
  book_unpublished: {
    icon: BookX,
    labelKey: 'unpublished a book',
    colorClass: 'text-warning',
  },
  note_added: {
    icon: MessageSquarePlus,
    labelKey: 'added a note',
    colorClass: 'text-accent',
  },
};

const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({ activity, isRead, onClickItem }) => {
  const _ = useTranslation();
  const config = actionConfig[activity.action];

  if (!config) return null;

  const Icon = config.icon;
  const relativeTime = dayjs(activity.created_at).fromNow();
  const bookTitle = activity.target_book_title || _('Unknown Book');

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={() => onClickItem?.(activity)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClickItem?.(activity);
      }}
      className={clsx(
        'flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5',
        'transition-colors',
        isRead ? 'opacity-45' : 'hover:bg-base-200/60',
      )}
    >
      <div className={clsx('mt-0.5 flex-shrink-0', config.colorClass)}>
        <Icon className='h-4 w-4' />
      </div>
      <div className='min-w-0 flex-1'>
        <p className='text-base-content text-xs leading-relaxed'>
          <span>{_(config.labelKey)}</span>
          <span className='font-medium'>{` "${bookTitle}"`}</span>
        </p>
        <p className='text-base-content/50 mt-0.5 text-[11px]'>{relativeTime}</p>
      </div>
      {!isRead && <div className='bg-primary mt-1.5 h-2 w-2 flex-shrink-0 rounded-full' />}
    </div>
  );
};

export default ActivityFeedItem;
