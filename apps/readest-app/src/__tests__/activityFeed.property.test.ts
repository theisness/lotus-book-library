/**
 * Property 6: Activity feed time descending order
 * Feature: public-bookshelf, Property 6: Activity feed time descending order
 *
 * For any activity feed query result list, the i-th record's `created_at`
 * timestamp should be >= the (i+1)-th record's `created_at` timestamp,
 * ensuring the feed is always sorted in descending chronological order.
 *
 * This simulates the API behavior of sorting by `created_at DESC`.
 *
 * **Validates: Requirements 6.3, 7.5**
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

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

// --- Sort function (mirrors the API behavior: ORDER BY created_at DESC) ---

function sortActivitiesByCreatedAtDesc(activities: ActivityRecord[]): ActivityRecord[] {
  return [...activities].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

// --- Arbitraries ---

const actionArb = fc.constantFrom(
  'book_published' as const,
  'book_updated' as const,
  'book_unpublished' as const,
  'note_added' as const,
);

const nonEmptyStringArb = fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0);

const isoTimestampArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ts) => new Date(ts).toISOString());

const activityRecordArb: fc.Arbitrary<ActivityRecord> = fc.record({
  id: fc.uuid(),
  action: actionArb,
  actor_user_id: fc.uuid(),
  target_book_hash: nonEmptyStringArb,
  target_book_title: fc.option(fc.string(), { nil: null }),
  details: fc.constant(null),
  created_at: isoTimestampArb,
});

const activityListArb = fc.array(activityRecordArb, { minLength: 0, maxLength: 30 });

// --- Tests ---

describe('Feature: public-bookshelf, Property 6: Activity feed time descending order', () => {
  it('for any result list sorted by created_at DESC, the i-th record created_at >= (i+1)-th record created_at', () => {
    fc.assert(
      fc.property(activityListArb, (activities) => {
        const sorted = sortActivitiesByCreatedAtDesc(activities);

        for (let i = 0; i < sorted.length - 1; i++) {
          const currentTime = new Date(sorted[i]!.created_at).getTime();
          const nextTime = new Date(sorted[i + 1]!.created_at).getTime();
          expect(currentTime).toBeGreaterThanOrEqual(nextTime);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('sorting should preserve all original records (no records lost or duplicated)', () => {
    fc.assert(
      fc.property(activityListArb, (activities) => {
        const sorted = sortActivitiesByCreatedAtDesc(activities);

        // Same length
        expect(sorted.length).toBe(activities.length);

        // Same set of IDs
        const originalIds = activities.map((a) => a.id).sort();
        const sortedIds = sorted.map((a) => a.id).sort();
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 20 },
    );
  });
});
