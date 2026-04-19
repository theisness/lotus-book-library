import { useState, useCallback } from 'react';
import { fetchActivityFeed } from '@/libs/publicBooks';
import type { ActivityRecord } from '@/types/public-bookshelf';

const DEFAULT_PAGE_SIZE = 20;

export const useActivityFeed = (): {
  activities: ActivityRecord[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
} => {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadPage = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchActivityFeed(targetPage, DEFAULT_PAGE_SIZE);
      const newActivities = data.activities || [];

      setActivities((prev) => (append ? [...prev, ...newActivities] : newActivities));
      setHasMore(targetPage < data.totalPages);
      setPage(targetPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity feed');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    loadPage(page + 1, true);
  }, [loading, hasMore, page, loadPage]);

  return { activities, loading, error, hasMore, loadMore };
};
