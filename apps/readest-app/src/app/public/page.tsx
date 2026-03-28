'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PublicBooksPage = () => {
  const router = useRouter();
  useEffect(() => {
    router.replace('/library');
  }, [router]);
  return null;
};

export default PublicBooksPage;
