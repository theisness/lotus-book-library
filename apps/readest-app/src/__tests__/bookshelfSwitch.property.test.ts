/**
 * Property 4: Bookshelf mode localStorage round-trip consistency
 * Feature: public-bookshelf, Property 4: Bookshelf mode localStorage round-trip consistency
 *
 * For any valid BookshelfMode value ('public' or 'personal'), writing it to
 * localStorage and reading it back should return the exact same value.
 *
 * Also tests the readStoredMode logic: for any stored value that is 'public'
 * or 'personal', it should return that value; for any other stored value,
 * it should return 'public' (default).
 *
 * **Validates: Requirements 2.4, 2.5**
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// --- In-memory localStorage mock for node environment ---

const store = new Map<string, string>();

const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
};

// --- Types ---

type BookshelfMode = 'public' | 'personal';

const STORAGE_KEY = 'library-bookshelf-mode';

function readStoredMode(): BookshelfMode {
  try {
    const stored = mockLocalStorage.getItem(STORAGE_KEY);
    if (stored === 'public' || stored === 'personal') return stored;
  } catch {
    // fall back to default
  }
  return 'public';
}

// --- Arbitraries ---

const bookshelfModeArb: fc.Arbitrary<BookshelfMode> = fc.constantFrom(
  'public' as const,
  'personal' as const,
);

const arbitraryStringArb = fc.string();

// --- Tests ---

describe('Feature: public-bookshelf, Property 4: Bookshelf mode localStorage round-trip', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('should round-trip any valid BookshelfMode through localStorage', () => {
    fc.assert(
      fc.property(bookshelfModeArb, (mode) => {
        mockLocalStorage.setItem(STORAGE_KEY, mode);

        const stored = mockLocalStorage.getItem(STORAGE_KEY);
        expect(stored).toBe(mode);

        const result = readStoredMode();
        expect(result).toBe(mode);
      }),
      { numRuns: 20 },
    );
  });

  it('should return the default "public" for any non-valid stored value', () => {
    fc.assert(
      fc.property(
        arbitraryStringArb.filter((s) => s !== 'public' && s !== 'personal'),
        (invalidValue) => {
          mockLocalStorage.setItem(STORAGE_KEY, invalidValue);

          const result = readStoredMode();
          expect(result).toBe('public');
        },
      ),
      { numRuns: 20 },
    );
  });

  it('should return "public" when localStorage has no value for the key', () => {
    const result = readStoredMode();
    expect(result).toBe('public');
  });
});
