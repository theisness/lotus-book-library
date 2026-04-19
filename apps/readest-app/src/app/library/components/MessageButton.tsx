import clsx from 'clsx';
import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

interface MessageButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const MessageButton: React.FC<MessageButtonProps> = ({ isOpen, onToggle }) => {
  const _ = useTranslation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <button
      type='button'
      onClick={onToggle}
      aria-label={isOpen ? _('Close Messages') : _('Open Messages')}
      aria-expanded={isOpen}
      className={clsx(
        'btn btn-ghost h-8 min-h-8 w-8 p-0',
        'text-base-content/60 hover:text-base-content',
        isOpen && 'bg-base-300/60',
      )}
    >
      <Bell className='h-[18px] w-[18px]' />
    </button>
  );
};

export default MessageButton;
