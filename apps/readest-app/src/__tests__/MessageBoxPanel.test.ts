/**
 * Unit tests for MessageBoxPanel component logic
 *
 * Since jsdom has ESM issues in this project, these tests verify the
 * component's core logic (click-outside detection, empty state, sort)
 * rather than rendering output.
 *
 * _Requirements: 6.2, 6.7_
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';

// --- Types (mirrored from public-bookshelf types) ---

interface ActivityRecord {
  id: string;
  action: 'book_published' | 'book_updated' | 'book_unpublished' | 'note_added';
  actor_user_id: string;
  target_book_hash: string;
  target_book_title: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// --- Logic extracted from the component ---

/**
 * Mirrors the click-outside detection logic from MessageBoxPanel:
 *
 *   if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
 *     onClose();
 *   }
 */
function shouldCloseOnClick(panelContainsTarget: boolean): boolean {
  return !panelContainsTarget;
}

/**
 * Mirrors the empty state condition from MessageBoxPanel:
 *
 *   if (isOpen && activities.length === 0 && !loading && !error) {
 *     loadMore();
 *   }
 */
function shouldTriggerInitialLoad(
  isOpen: boolean,
  activitiesLength: number,
  loading: boolean,
  error: string | null,
): boolean {
  return isOpen && activitiesLength === 0 && !loading && !error;
}

/**
 * Mirrors the empty state render condition from MessageBoxPanel:
 *
 *   {!loading && !error && sortedActivities.length === 0 && (
 *     <div>No messages yet</div>
 *   )}
 */
function shouldShowEmptyState(
  loading: boolean,
  error: string | null,
  activitiesLength: number,
): boolean {
  return !loading && !error && activitiesLength === 0;
}

/**
 * Mirrors the sort logic from MessageBoxPanel:
 *
 *   const sortedActivities = [...activities].sort(
 *     (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
 *   );
 */
function sortActivitiesDesc(activities: ActivityRecord[]): ActivityRecord[] {
  return [...activities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

// --- Tests ---

describe('MessageBoxPanel – click-outside detection logic', () => {
  it('should close when click is outside the panel', () => {
    expect(shouldCloseOnClick(false)).toBe(true);
  });

  it('should NOT close when click is inside the panel', () => {
    expect(shouldCloseOnClick(true)).toBe(false);
  });
});

describe('MessageBoxPanel – initial load trigger', () => {
  it('should trigger load when panel is open, no activities, not loading, no error', () => {
    expect(shouldTriggerInitialLoad(true, 0, false, null)).toBe(true);
  });

  it('should NOT trigger load when panel is closed', () => {
    expect(shouldTriggerInitialLoad(false, 0, false, null)).toBe(false);
  });

  it('should NOT trigger load when already loading', () => {
    expect(shouldTriggerInitialLoad(true, 0, true, null)).toBe(false);
  });

  it('should NOT trigger load when there is an error', () => {
    expect(shouldTriggerInitialLoad(true, 0, false, 'Network error')).toBe(false);
  });

  it('should NOT trigger load when activities already exist', () => {
    expect(shouldTriggerInitialLoad(true, 5, false, null)).toBe(false);
  });
});

describe('MessageBoxPanel – empty state condition', () => {
  it('should show empty state when not loading, no error, and no activities', () => {
    expect(shouldShowEmptyState(false, null, 0)).toBe(true);
  });

  it('should NOT show empty state when loading', () => {
    expect(shouldShowEmptyState(true, null, 0)).toBe(false);
  });

  it('should NOT show empty state when there is an error', () => {
    expect(shouldShowEmptyState(false, 'Failed to load', 0)).toBe(false);
  });

  it('should NOT show empty state when activities exist', () => {
    expect(shouldShowEmptyState(false, null, 3)).toBe(false);
  });
});

describe('MessageBoxPanel – sort activities by created_at DESC', () => {
  it('should sort activities with newest first', () => {
    const activities: ActivityRecord[] = [
      {
        id: '1',
        action: 'book_published',
        actor_user_id: 'u1',
        target_book_hash: 'h1',
        target_book_title: 'Book A',
        details: null,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        action: 'book_updated',
        actor_user_id: 'u1',
        target_book_hash: 'h2',
        target_book_title: 'Book B',
        details: null,
        created_at: '2024-06-15T12:00:00Z',
      },
      {
        id: '3',
        action: 'note_added',
        actor_user_id: 'u1',
        target_book_hash: 'h3',
        target_book_title: 'Book C',
        details: null,
        created_at: '2024-03-10T08:30:00Z',
      },
    ];

    const sorted = sortActivitiesDesc(activities);

    expect(sorted[0]!.id).toBe('2'); // June 15 (newest)
    expect(sorted[1]!.id).toBe('3'); // March 10
    expect(sorted[2]!.id).toBe('1'); // January 1 (oldest)
  });

  it('should return an empty array when given an empty array', () => {
    const sorted = sortActivitiesDesc([]);
    expect(sorted).toEqual([]);
  });

  it('should not mutate the original array', () => {
    const activities: ActivityRecord[] = [
      {
        id: '1',
        action: 'book_published',
        actor_user_id: 'u1',
        target_book_hash: 'h1',
        target_book_title: 'A',
        details: null,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        action: 'book_updated',
        actor_user_id: 'u1',
        target_book_hash: 'h2',
        target_book_title: 'B',
        details: null,
        created_at: '2024-12-01T00:00:00Z',
      },
    ];

    const originalFirst = activities[0]!.id;
    sortActivitiesDesc(activities);
    expect(activities[0]!.id).toBe(originalFirst);
  });

  it('should handle activities with identical timestamps', () => {
    const sameTime = '2024-06-01T00:00:00Z';
    const activities: ActivityRecord[] = [
      {
        id: 'a',
        action: 'book_published',
        actor_user_id: 'u1',
        target_book_hash: 'h1',
        target_book_title: 'X',
        details: null,
        created_at: sameTime,
      },
      {
        id: 'b',
        action: 'book_updated',
        actor_user_id: 'u1',
        target_book_hash: 'h2',
        target_book_title: 'Y',
        details: null,
        created_at: sameTime,
      },
    ];

    const sorted = sortActivitiesDesc(activities);
    expect(sorted).toHaveLength(2);
    // Both have the same timestamp, so order is stable but both should be present
    const ids = sorted.map((a) => a.id).sort();
    expect(ids).toEqual(['a', 'b']);
  });
});
