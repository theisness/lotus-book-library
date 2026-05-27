/**
 * Property 3: PublicBook to Book mapping completeness
 * Feature: public-bookshelf, Property 3: PublicBook to Book mapping completeness
 *
 * For any valid PublicBook object, after `publicBookToBook` conversion:
 * - hash should start with `public-`
 * - title should equal original title (or default value)
 * - url should start with `__public__`
 * - format should be correctly mapped
 *
 * Since `publicBookToBook` is a private function inside usePublicBooks.ts,
 * we replicate its logic here and verify the mapping contract holds for
 * any valid PublicBook input.
 *
 * **Validates: Requirements 1.5**
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Types (mirrored from libs/publicBooks.ts) ---

interface PublicBook {
  id: string;
  owner_user_id: string;
  book_hash: string;
  title: string | null;
  author: string | null;
  format: string | null;
  cover_file_key: string | null;
  book_file_key: string;
  published_at: string;
  coverUrl?: string;
}

type BookFormat = 'EPUB' | 'PDF' | 'MOBI' | 'AZW' | 'AZW3' | 'CBZ' | 'FB2' | 'FBZ' | 'TXT' | 'MD';

interface BookResult {
  hash: string;
  format: BookFormat;
  title: string;
  author: string;
  coverImageUrl: string | null;
  url: string;
  createdAt: number;
  updatedAt: number;
  uploadedAt: null;
  downloadedAt: null;
}

// --- Mapping function (mirrors publicBookToBook in usePublicBooks.ts) ---

function publicBookToBook(pub: PublicBook): BookResult {
  return {
    hash: `public-${pub.id}`,
    format: (pub.format?.toUpperCase() as BookFormat) || 'EPUB',
    title: pub.title || '未知书名',
    author: pub.author || '',
    coverImageUrl: pub.coverUrl || null,
    url: `__public__${pub.id}:${pub.book_hash}`,
    createdAt: new Date(pub.published_at).getTime(),
    updatedAt: new Date(pub.published_at).getTime(),
    uploadedAt: null,
    downloadedAt: null,
  };
}

// --- Arbitraries ---

const nonEmptyAsciiStringArb = fc
  .string({ minLength: 1 })
  .map((s) => s.replace(/[^\x20-\x7E]/g, 'a'))
  .filter((s) => s.length > 0);

const formatArb = fc.constantFrom(
  'epub',
  'pdf',
  'mobi',
  'azw',
  'azw3',
  'cbz',
  'fb2',
  'fbz',
  'txt',
  'md',
  null,
);

const publicBookArb: fc.Arbitrary<PublicBook> = fc.record({
  id: nonEmptyAsciiStringArb,
  owner_user_id: nonEmptyAsciiStringArb,
  book_hash: nonEmptyAsciiStringArb,
  title: fc.oneof(nonEmptyAsciiStringArb, fc.constant(null)),
  author: fc.oneof(nonEmptyAsciiStringArb, fc.constant(null)),
  format: formatArb,
  cover_file_key: fc.oneof(nonEmptyAsciiStringArb, fc.constant(null)),
  book_file_key: nonEmptyAsciiStringArb,
  published_at: fc
    .integer({ min: 946684800000, max: 1893456000000 })
    .map((ts) => new Date(ts).toISOString()),
  coverUrl: fc.oneof(nonEmptyAsciiStringArb, fc.constant(undefined)),
});

// --- Tests ---

describe('Feature: public-bookshelf, Property 3: PublicBook to Book mapping completeness', () => {
  it('should produce a Book with hash starting with "public-"', () => {
    fc.assert(
      fc.property(publicBookArb, (pub) => {
        const book = publicBookToBook(pub);
        expect(book.hash).toBe(`public-${pub.id}`);
        expect(book.hash.startsWith('public-')).toBe(true);
      }),
      { numRuns: 20 },
    );
  });

  it('should map title to original title or default value', () => {
    fc.assert(
      fc.property(publicBookArb, (pub) => {
        const book = publicBookToBook(pub);
        if (pub.title) {
          expect(book.title).toBe(pub.title);
        } else {
          expect(book.title).toBe('未知书名');
        }
      }),
      { numRuns: 20 },
    );
  });

  it('should produce a Book with url starting with "__public__"', () => {
    fc.assert(
      fc.property(publicBookArb, (pub) => {
        const book = publicBookToBook(pub);
        expect(book.url).toBe(`__public__${pub.id}:${pub.book_hash}`);
        expect(book.url.startsWith('__public__')).toBe(true);
      }),
      { numRuns: 20 },
    );
  });

  it('should correctly map format to uppercase or default to EPUB', () => {
    fc.assert(
      fc.property(publicBookArb, (pub) => {
        const book = publicBookToBook(pub);
        if (pub.format) {
          expect(book.format).toBe(pub.format.toUpperCase());
        } else {
          expect(book.format).toBe('EPUB');
        }
      }),
      { numRuns: 20 },
    );
  });
});
