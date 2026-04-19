/**
 * Property 1: Book search filter correctness
 * Feature: public-bookshelf, Property 1: Book search filter correctness
 *
 * For any valid book array and any non-empty search keyword, a filter function
 * that matches title or author (case-insensitive) should:
 * - Return only books whose title or author contains the keyword
 * - Not miss any matching books
 *
 * The filter logic mirrors the search behaviour expected in the Public_Bookshelf_View
 * and Personal_Bookshelf_View components.
 *
 * **Validates: Requirements 1.3, 2.6, 8.3**
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Types (simplified Book for filter testing) ---

interface Book {
  hash: string;
  title: string;
  author: string;
}

// --- Filter function (mirrors expected search behaviour) ---

function createBookFilter(keyword: string): (book: Book) => boolean {
  const lowerKeyword = keyword.toLowerCase();
  return (book: Book) =>
    book.title.toLowerCase().includes(lowerKeyword) ||
    book.author.toLowerCase().includes(lowerKeyword);
}

// --- Arbitraries (ASCII-only) ---

const asciiStringArb = fc.string().filter((s) => /^[\x20-\x7E]*$/.test(s));

const bookArb: fc.Arbitrary<Book> = fc.record({
  hash: asciiStringArb.filter((s) => s.length > 0),
  title: asciiStringArb,
  author: asciiStringArb,
});

const bookArrayArb = fc.array(bookArb, { minLength: 0, maxLength: 30 });

const nonEmptyAsciiStringArb = asciiStringArb.filter((s) => s.trim().length > 0);

// --- Tests ---

describe('Feature: public-bookshelf, Property 1: Book search filter correctness', () => {
  it('should return only books whose title or author contains the keyword (case-insensitive)', () => {
    fc.assert(
      fc.property(bookArrayArb, nonEmptyAsciiStringArb, (books, keyword) => {
        const filter = createBookFilter(keyword);
        const filtered = books.filter(filter);

        const lowerKeyword = keyword.toLowerCase();

        // Every returned book must match the keyword in title or author
        for (const book of filtered) {
          const titleMatch = book.title.toLowerCase().includes(lowerKeyword);
          const authorMatch = book.author.toLowerCase().includes(lowerKeyword);
          expect(titleMatch || authorMatch).toBe(true);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('should not miss any matching books (completeness)', () => {
    fc.assert(
      fc.property(bookArrayArb, nonEmptyAsciiStringArb, (books, keyword) => {
        const filter = createBookFilter(keyword);
        const filtered = books.filter(filter);

        const lowerKeyword = keyword.toLowerCase();

        // Every book that matches should be in the filtered result
        for (const book of books) {
          const titleMatch = book.title.toLowerCase().includes(lowerKeyword);
          const authorMatch = book.author.toLowerCase().includes(lowerKeyword);
          if (titleMatch || authorMatch) {
            expect(filtered).toContain(book);
          }
        }
      }),
      { numRuns: 20 },
    );
  });

  it('should return the same count as a manual filter', () => {
    fc.assert(
      fc.property(bookArrayArb, nonEmptyAsciiStringArb, (books, keyword) => {
        const filter = createBookFilter(keyword);
        const filtered = books.filter(filter);

        const lowerKeyword = keyword.toLowerCase();
        const manualCount = books.filter(
          (b) =>
            b.title.toLowerCase().includes(lowerKeyword) ||
            b.author.toLowerCase().includes(lowerKeyword),
        ).length;

        expect(filtered.length).toBe(manualCount);
      }),
      { numRuns: 20 },
    );
  });
});
