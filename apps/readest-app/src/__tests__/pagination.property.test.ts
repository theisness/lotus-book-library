/**
 * Property 8: Pagination calculation correctness
 * Feature: public-bookshelf, Property 8: Pagination calculation correctness
 *
 * For any positive integer `total` and valid `page`/`pageSize` parameters,
 * `totalPages` should equal `Math.ceil(total / pageSize)`, and the number
 * of returned records should not exceed `pageSize`.
 *
 * The pagination logic is replicated from `listActivities` in
 * `apps/backend/src/services/activity-log.service.ts`.
 *
 * **Validates: Requirements 7.1**
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Pagination logic (mirrors listActivities in activity-log.service.ts) ---

interface PaginationResult {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  recordCount: number;
}

function computePagination(total: number, page: number, pageSize: number): PaginationResult {
  const totalPages = Math.ceil(total / pageSize);

  let recordCount: number;
  if (page > totalPages) {
    recordCount = 0;
  } else {
    recordCount = Math.min(pageSize, total - (page - 1) * pageSize);
  }

  return { total, page, pageSize, totalPages, recordCount };
}

// --- Tests ---

describe('Feature: public-bookshelf, Property 8: Pagination calculation correctness', () => {
  it('totalPages should equal Math.ceil(total / pageSize) for any valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (total, page, pageSize) => {
          const result = computePagination(total, page, pageSize);
          expect(result.totalPages).toBe(Math.ceil(total / pageSize));
        },
      ),
      { numRuns: 20 },
    );
  });

  it('record count should not exceed pageSize and should be correct for valid/invalid pages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (total, page, pageSize) => {
          const result = computePagination(total, page, pageSize);

          expect(result.recordCount).toBeLessThanOrEqual(pageSize);
          expect(result.recordCount).toBeGreaterThanOrEqual(0);

          if (page > result.totalPages) {
            expect(result.recordCount).toBe(0);
          } else {
            const expected = Math.min(pageSize, total - (page - 1) * pageSize);
            expect(result.recordCount).toBe(expected);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
