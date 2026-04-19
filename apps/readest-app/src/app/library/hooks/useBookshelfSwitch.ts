import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { BookshelfMode } from '@/types/public-bookshelf';

const STORAGE_KEY = 'library-bookshelf-mode';

const readStoredMode = (): BookshelfMode => {
  if (typeof window === 'undefined') return 'public';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'public' || stored === 'personal') return stored;
  } catch {
    // localStorage unavailable — fall back to default
  }
  return 'public';
};

export const useBookshelfSwitch = (): {
  mode: BookshelfMode;
  setMode: (mode: BookshelfMode) => void;
} => {
  const { user } = useAuth();
  const [mode, setModeState] = useState<BookshelfMode>(readStoredMode);

  const setMode = useCallback((newMode: BookshelfMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // localStorage unavailable — state still updated in memory
    }
  }, []);

  // Unauthenticated users always see the public bookshelf
  if (!user) {
    return { mode: 'public', setMode };
  }

  return { mode, setMode };
};
