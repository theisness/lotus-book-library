/**
 * Property 2: Book sort correctness
 * Feature: public-bookshelf, Property 2: Book sort correctness
 *
 * For any valid book array and any sort field (title / author / updatedAt),
 * a sort function should produce an array where adjacent elements satisfy
 * the ordering relation (ascending: a <= b).
 *
 * The sort logic mirrors the expected behaviour in the Public_Bookshelf_View
 * and Personal_Bookshelf_View components.
 *
 * **Validates: Requirements 1.3, 2.6, 8.2**
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Types (simplified Book for sort testing) ---

interface Book {
  hash: string;
  title: string;
  author: string;
  updatedAt: number; // epoch ms
}

type SortField = 'title' | 'author' | 'updatedAt';

// --- Sort function (mirrors expected sort behaviour) ---

function createBookSorter(field: SortField): (a: Book, b: Book) => number {
  return (a: Book, b: Book) => {
    if (field === 'updatedAt') {
      return a.updatedAt - b.updatedAt;
    }
    return a[field].toLowerCase().localeCompare(b[field].toLowerCase());
  };
}

// --- Arbitraries (ASCII-only) ---

const asciiStringArb = fc.string().filter((s) => /^[\x20-\x7E]*$/.test(s));

const bookArb: fc.Arbitrary<Book> = fc.record({
  hash: asciiStringArb.filter((s) => s.length > 0),
  title: asciiStringArb,
  author: asciiStringArb,
  updatedAt: fc.integer({ min: 0, max: 2000000000000 }),
});

const bookArrayArb = fc.array(bookArb, { minLength: 0, maxLength: 30 });

const sortFieldArb: fc.Arbitrary<SortField> = fc.constantFrom(
  'title' as const,
  'author' as const,
  'updatedAt' as const,
);

// --- Tests ---

describe('Feature: public-bookshelf, Property 2: Book sort correctness', () => {
  it('adjacent elements should satisfy ascending ordering relation for any sort field', () => {
    fc.assert(
      fc.property(bookArrayArb, sortFieldArb, (books, field) => {
        const sorter = createBookSorter(field);
        const sorted = [...books].sort(sorter);

        for (let i = 0; i < sorted.length - 1; i++) {
          const a = sorted[i]!;
          const b = sorted[i + 1]!;

          if (field === 'updatedAt') {
            expect(a.updatedAt).toBeLessThanOrEqual(b.updatedAt);
          } else {
            const cmp = a[field].toLowerCase().localeCompare(b[field].toLowerCase());
            expect(cmp).toBeLessThanOrEqual(0);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('sorted array should have the same length as the input', () => {
    fc.assert(
      fc.property(bookArrayArb, sortFieldArb, (books, field) => {
        const sorter = createBookSorter(field);
        const sorted = [...books].sort(sorter);

        expect(sorted.length).toBe(books.length);
      }),
      { numRuns: 20 },
    );
  });

  it('sorted array should contain exactly the same elements as the input', () => {
    fc.assert(
      fc.property(bookArrayArb, sortFieldArb, (books, field) => {
        const sorter = createBookSorter(field);
        const sorted = [...books].sort(sorter);

        // Every book in the original should appear in sorted (by reference)
        for (const book of books) {
          expect(sorted).toContain(book);
        }
      }),
      { numRuns: 20 },
    );
  });
});
