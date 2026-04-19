import clsx from 'clsx';
import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { BookshelfMode } from '@/types/public-bookshelf';

interface BookshelfSwitcherProps {
  mode: BookshelfMode;
  onModeChange: (mode: BookshelfMode) => void;
}

const tabs: { key: BookshelfMode; labelKey: string }[] = [
  { key: 'public', labelKey: 'Public Bookshelf' },
  { key: 'personal', labelKey: 'My Bookshelf' },
];

const BookshelfSwitcher: React.FC<BookshelfSwitcherProps> = ({ mode, onModeChange }) => {
  const _ = useTranslation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div
      role='tablist'
      aria-label={_('Bookshelf Switcher')}
      className='bg-base-300/50 relative flex items-center rounded-full p-0.5'
    >
      {tabs.map((tab) => {
        const isActive = mode === tab.key;
        return (
          <button
            key={tab.key}
            role='tab'
            type='button'
            aria-selected={isActive}
            onClick={() => onModeChange(tab.key)}
            className={clsx(
              'relative z-10 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors',
              'sm:text-sm',
              isActive ? 'text-base-content' : 'text-base-content/60 hover:text-base-content/80',
            )}
          >
            {isActive && (
              <motion.span
                layoutId='bookshelf-tab-indicator'
                className='bg-base-100 absolute inset-0 rounded-full shadow-sm'
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <span className='relative'>{_(tab.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default BookshelfSwitcher;
