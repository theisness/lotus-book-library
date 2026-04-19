import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPublicNotes } from '@/libs/publicBooks';
import type { PublicBookNote } from '@/types/public-bookshelf';

export const usePublicBookNotes = (
  bookHash: string,
): {
  notes: PublicBookNote[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
} => {
  const [notes, setNotes] = useState<PublicBookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    if (!bookHash) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchPublicNotes(bookHash);
        if (!cancelledRef.current) {
          setNotes(data);
        }
      } catch (err) {
        if (!cancelledRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch notes');
        }
      } finally {
        if (!cancelledRef.current) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelledRef.current = true;
    };
  }, [bookHash, fetchKey]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return { notes, loading, error, refetch };
};
