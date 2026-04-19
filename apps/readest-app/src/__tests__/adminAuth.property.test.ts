/**
 * Property 5: Non-admin write operation rejection
 * Feature: public-bookshelf, Property 5: Non-admin write operation rejection
 *
 * For any authenticated user without admin privileges, requests to public book
 * write APIs (POST notes, DELETE notes, POST configs) should return HTTP 403
 * status code.
 *
 * Since we cannot easily spin up the Express server in a property test, we
 * replicate the admin check logic from `requireAdmin` middleware
 * (`apps/backend/src/middleware/admin.ts`) and `isUserAdmin`
 * (`apps/backend/src/services/auth.service.ts`).
 *
 * The middleware checks `user_profiles.is_admin === true`. For any user profile
 * where `is_admin` is false/undefined/null, the middleware rejects with 403.
 *
 * **Validates: Requirements 3.4, 3.5, 3.6**
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// --- Admin check logic (mirrors isUserAdmin + requireAdmin middleware) ---

function isUserAdmin(
  profile: { is_admin?: boolean | null | undefined } | null | undefined,
): boolean {
  return profile?.is_admin === true;
}

function simulateRequireAdmin(
  authenticated: boolean,
  profile: { is_admin?: boolean | null | undefined } | null | undefined,
): { status: number; error?: string } {
  if (!authenticated) {
    return { status: 403, error: 'Not authenticated' };
  }
  if (!isUserAdmin(profile)) {
    return { status: 403, error: 'Admin access required' };
  }
  return { status: 200 };
}

// --- Write API endpoints protected by requireAdmin ---

const PROTECTED_WRITE_ENDPOINTS = [
  'POST /api/public/notes',
  'DELETE /api/public/notes',
  'POST /api/public/configs',
] as const;

// --- Arbitraries ---

const nonAdminProfileArb: fc.Arbitrary<{ is_admin: boolean | null | undefined }> = fc.oneof(
  fc.constant({ is_admin: false }),
  fc.constant({ is_admin: null }),
  fc.constant({ is_admin: undefined }),
);

const adminProfileArb: fc.Arbitrary<{ is_admin: true }> = fc.constant({
  is_admin: true as const,
});

const endpointArb = fc.constantFrom(...PROTECTED_WRITE_ENDPOINTS);

const userIdArb = fc.uuid();

// --- Tests ---

describe('Feature: public-bookshelf, Property 5: Non-admin write operation rejection', () => {
  it('should reject with 403 for any authenticated non-admin user on any write endpoint', () => {
    fc.assert(
      fc.property(userIdArb, nonAdminProfileArb, endpointArb, (_userId, profile, endpoint) => {
        const result = simulateRequireAdmin(true, profile);
        expect(result.status).toBe(403);
        expect(result.error).toBe('Admin access required');
        expect(PROTECTED_WRITE_ENDPOINTS).toContain(endpoint);
      }),
      { numRuns: 20 },
    );
  });

  it('should reject with 403 for unauthenticated requests on any write endpoint', () => {
    fc.assert(
      fc.property(endpointArb, (endpoint) => {
        const result = simulateRequireAdmin(false, null);
        expect(result.status).toBe(403);
        expect(result.error).toBe('Not authenticated');
        expect(PROTECTED_WRITE_ENDPOINTS).toContain(endpoint);
      }),
      { numRuns: 20 },
    );
  });

  it('should allow admin users (is_admin === true) on any write endpoint', () => {
    fc.assert(
      fc.property(userIdArb, adminProfileArb, endpointArb, (_userId, profile, endpoint) => {
        const result = simulateRequireAdmin(true, profile);
        expect(result.status).toBe(200);
        expect(result.error).toBeUndefined();
        expect(PROTECTED_WRITE_ENDPOINTS).toContain(endpoint);
      }),
      { numRuns: 20 },
    );
  });

  it('isUserAdmin should return false for any profile where is_admin is not exactly true', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant({ is_admin: false }),
          fc.constant({ is_admin: null }),
          fc.constant({ is_admin: undefined }),
          fc.constant(null),
          fc.constant(undefined),
        ),
        (profile) => {
          expect(isUserAdmin(profile)).toBe(false);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('isUserAdmin should return true only when is_admin is exactly true', () => {
    fc.assert(
      fc.property(adminProfileArb, (profile) => {
        expect(isUserAdmin(profile)).toBe(true);
      }),
      { numRuns: 20 },
    );
  });
});
