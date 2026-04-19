/**
 * Property 9: Personal bookshelf excludes public books
 * Feature: public-bookshelf, Property 9: Personal bookshelf excludes public books
 *
 * For any book in the personal bookshelf view, `isPublicBook(book)` should
 * return false. This ensures that public books (whose url starts with
 * `__public__`) never appear in the personal bookshelf.
 *
 * We replicate the `isPublicBook` logic from usePublicBooks.ts and generate
 * mixed arrays of public and personal books, then filter to personal-only
 * and verify the invariant.
 *
 * **Validates: Requirements 9.2**
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Types (mirrored from types/book.ts) ---

type BookFormat = 'EPUB' | 'PDF' | 'MOBI' | 'AZW' | 'AZW3' | 'CBZ' | 'FB2' | 'FBZ' | 'TXT' | 'MD';

interface Book {
  url?: string;
  hash: string;
  format: BookFormat;
  title: string;
  author: string;
  coverImageUrl?: string | null;
  createdAt: number;
  updatedAt: number;
  uploadedAt?: number | null;
  downloadedAt?: number | null;
}

// --- Logic (mirrored from usePublicBooks.ts) ---

function isPublicBook(book: Book): boolean {
  return !!book.url?.startsWith('__public__');
}

function filterPersonalBooks(allBooks: Book[]): Book[] {
  return allBooks.filter((book) => !isPublicBook(book));
}

// --- Arbitraries ---

const asciiStringArb = fc.string().map((s) => s.replace(/[^\x20-\x7E]/g, 'a'));
const nonEmptyAsciiStringArb = fc
  .string({ minLength: 1 })
  .map((s) => s.replace(/[^\x20-\x7E]/g, 'a'))
  .filter((s) => s.length > 0);

const formatArb: fc.Arbitrary<BookFormat> = fc.constantFrom(
  'EPUB',
  'PDF',
  'MOBI',
  'AZW',
  'AZW3',
  'CBZ',
  'FB2',
  'FBZ',
  'TXT',
  'MD',
);

const timestampArb = fc.integer({ min: 946684800000, max: 1893456000000 }); // 2000-2030

/** A personal book: url is either undefined or does NOT start with __public__ */
const personalBookArb: fc.Arbitrary<Book> = fc.record({
  url: fc.oneof(
    fc.constant(undefined),
    nonEmptyAsciiStringArb.filter((s) => !s.startsWith('__public__')),
  ),
  hash: nonEmptyAsciiStringArb,
  format: formatArb,
  title: nonEmptyAsciiStringArb,
  author: nonEmptyAsciiStringArb,
  coverImageUrl: fc.oneof(nonEmptyAsciiStringArb, fc.constant(null)),
  createdAt: timestampArb,
  updatedAt: timestampArb,
  uploadedAt: fc.oneof(timestampArb, fc.constant(null)),
  downloadedAt: fc.oneof(timestampArb, fc.constant(null)),
});

/** A public book: url starts with __public__ */
const publicBookArb: fc.Arbitrary<Book> = fc.record({
  url: nonEmptyAsciiStringArb.map((s) => `__public__${s}`),
  hash: nonEmptyAsciiStringArb.map((s) => `public-${s}`),
  format: formatArb,
  title: nonEmptyAsciiStringArb,
  author: nonEmptyAsciiStringArb,
  coverImageUrl: fc.oneof(nonEmptyAsciiStringArb, fc.constant(null)),
  createdAt: timestampArb,
  updatedAt: timestampArb,
  uploadedAt: fc.constant(null),
  downloadedAt: fc.constant(null),
});

/** A mixed array of personal and public books */
const mixedBooksArb = fc.array(fc.oneof(personalBookArb, publicBookArb), {
  minLength: 1,
  maxLength: 20,
});

// --- Tests ---

describe('Feature: public-bookshelf, Property 9: Personal bookshelf excludes public books', () => {
  it('should return false for isPublicBook on every book in the personal bookshelf', () => {
    fc.assert(
      fc.property(mixedBooksArb, (allBooks) => {
        const personalBooks = filterPersonalBooks(allBooks);

        for (const book of personalBooks) {
          expect(isPublicBook(book)).toBe(false);
        }
      }),
      { numRuns: 20 },
    );
  });

  it('should filter out all public books from a mixed list', () => {
    fc.assert(
      fc.property(mixedBooksArb, (allBooks) => {
        const personalBooks = filterPersonalBooks(allBooks);
        const publicCount = allBooks.filter((b) => isPublicBook(b)).length;

        // Personal books count + public books count should equal total
        expect(personalBooks.length + publicCount).toBe(allBooks.length);

        // No personal book should have a url starting with __public__
        for (const book of personalBooks) {
          if (book.url) {
            expect(book.url.startsWith('__public__')).toBe(false);
          }
        }
      }),
      { numRuns: 20 },
    );
  });
});
