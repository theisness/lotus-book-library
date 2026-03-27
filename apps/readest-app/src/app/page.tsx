'use client';

import { useAuth } from '@/context/AuthContext';
import { isWebAppPlatform } from '@/services/environment';
import LibraryPage from './library/page';
import PublicBooksPage from './public/page';

export default function HomePage() {
  const { user } = useAuth();

  if (isWebAppPlatform() && !user) {
    return <PublicBooksPage />;
  }

  return <LibraryPage />;
}
