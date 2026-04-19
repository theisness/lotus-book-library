import { useState, useEffect } from 'react';
import { fetchPublicConfig } from '@/libs/publicBooks';
import type { PublicBookConfig } from '@/types/public-bookshelf';

export const usePublicBookConfig = (
  bookHash: string,
): {
  config: PublicBookConfig | null;
  loading: boolean;
  error: string | null;
} => {
  const [config, setConfig] = useState<PublicBookConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!bookHash) {
        setConfig(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchPublicConfig(bookHash);
        if (!cancelled) {
          setConfig(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch config');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [bookHash]);

  return { config, loading, error };
};
