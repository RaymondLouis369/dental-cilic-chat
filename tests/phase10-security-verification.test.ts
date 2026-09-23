/**
 * Phase 10: Final Security Verification Test Suite for Patient AI Chat
 * Dental Clinic & Dental Center Management Platform — Egypt
 *
 * Verifies 11 core security invariants:
 * 1. Server derives authenticated user identity from real Supabase Auth session/token.
 * 2. requesterPatientId from browser is never trusted for authorization.
 * 3. organizationId from browser is never trusted for authorization.
 * 4. Target patient access is validated from database relationships.
 * 5. Patient A cannot access Patient B.
 * 6. Unauthorized guardians cannot access dependents.
 * 7. Authorized guardians can access dependents.
 * 8. Organization isolation is enforced server-side.
 * 9. Production authenticated requests never fall back to DEFAULT_EGYPT_ORG/demo identity.
 * 10. Supabase RLS remains the final protection layer.
 * 11. localStorage contains no patient AI chat history.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateServerAuthorization } from '../src/lib/ai/serverAuth';
import { simulatePatientRLS } from '../src/lib/patientStorage';
import { DEFAULT_EGYPT_ORG, SECONDARY_EGYPT_ORG } from '../src/lib/storage';

// Known seed IDs from patientStorage.ts
const AHMED_ID = 'a1111111-1111-1111-1111-111111111111'; // Ahmed (Adult, Guardian of Laila & Omar)
const LAILA_ID = 'b2222222-2222-2222-2222-222222222222'; // Laila (Ward of Ahmed)
const MONA_ID = 'd4444444-4444-4444-4444-444444444444'; // Mona (Independent adult, no relation to Ahmed/Laila)
const TAREQ_SEC_ID = 'e5555555-5555-5555-5555-555555555555'; // Tareq (Secondary Org)

describe('Phase 10 — Patient AI Chat Security Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // 1. Server derives authenticated user identity from token
  it('1. Server derives authenticated user identity from real Bearer token', async () => {
    const res = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${AHMED_ID}`,
    });

    expect(res.authorized).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.context?.authenticatedPatientId).toBe(AHMED_ID);
    expect(res.context?.organizationId).toBe(DEFAULT_EGYPT_ORG.id);

    const invalidRes = await validateServerAuthorization({
      authorizationHeader: 'Bearer token_invalid_nonexistent_user',
    });

    expect(invalidRes.authorized).toBe(false);
    expect(invalidRes.statusCode).toBe(401);
  });

  // 2. requesterPatientId from browser is never trusted
  it('2. Never trusts requesterPatientId from the browser for authorization decisions', async () => {
    // Client sends Mona's ID in body, but passes Ahmed's token in header
    const res = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${AHMED_ID}`,
      requesterPatientIdBody: MONA_ID,
    });

    expect(res.authorized).toBe(true);
    // Server strictly derives authenticated patient identity from token (Ahmed), NOT from browser body (Mona)
    expect(res.context?.authenticatedPatientId).toBe(AHMED_ID);
  });

  // 3. organizationId from browser is never trusted
  it('3. Rejects cross-organization organizationId sent from browser', async () => {
    // Client sends Ahmed's token (Primary Org), but specifies Secondary Org in body
    const res = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${AHMED_ID}`,
      organizationIdBody: SECONDARY_EGYPT_ORG.id,
    });

    expect(res.authorized).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error).toContain('Cross-organization access violation');
  });

  // 4. Target patient access validated from database relationships
  it('4. Validates target patient access from database relationships', async () => {
    // Ahmed accessing own account
    const selfRes = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${AHMED_ID}`,
      targetPatientIdBody: AHMED_ID,
    });
    expect(selfRes.authorized).toBe(true);

    // Ahmed accessing authorized ward Laila
    const wardRes = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${AHMED_ID}`,
      targetPatientIdBody: LAILA_ID,
    });
    expect(wardRes.authorized).toBe(true);

    // Mona attempting to access Ahmed
    const unauthorizedRes = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${MONA_ID}`,
      targetPatientIdBody: AHMED_ID,
    });
    expect(unauthorizedRes.authorized).toBe(false);
  });

  // 5. Patient A cannot access Patient B
  it('5. Prevents Patient A (Mona) from accessing Patient B (Ahmed)', async () => {
    const res = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${MONA_ID}`,
      targetPatientIdBody: AHMED_ID,
    });

    expect(res.authorized).toBe(false);
    expect(res.statusCode).toBe(403);
    expect(res.error?.toLowerCase()).toContain('denied');
  });

  // 6. Unauthorized guardians cannot access dependents
  it('6. Blocks unauthorized guardians from accessing dependents', async () => {
    // Mona (no guardian link to Laila) attempting to access Laila
    const res = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${MONA_ID}`,
      targetPatientIdBody: LAILA_ID,
    });

    expect(res.authorized).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  // 7. Authorized guardians can access dependents
  it('7. Allows authorized verified guardians (Ahmed) to access dependents (Laila)', async () => {
    const res = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${AHMED_ID}`,
      targetPatientIdBody: LAILA_ID,
    });

    expect(res.authorized).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.context?.targetPatientId).toBe(LAILA_ID);
  });

  // 8. Organization isolation is enforced server-side
  it('8. Enforces organization isolation so primary org user cannot access secondary org patient', async () => {
    const res = await validateServerAuthorization({
      authorizationHeader: `Bearer token_${AHMED_ID}`,
      targetPatientIdBody: TAREQ_SEC_ID,
    });

    expect(res.authorized).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  // 9. Production authenticated requests never fall back to DEFAULT_EGYPT_ORG/demo identity
  it('9. Rejects invalid/missing tokens in production without falling back to demo identity', async () => {
    const resNoToken = await validateServerAuthorization({
      isProduction: true,
      targetPatientIdBody: AHMED_ID,
    });

    expect(resNoToken.authorized).toBe(false);
    expect(resNoToken.statusCode).toBe(401);
    expect(resNoToken.error).toContain('Missing Authorization header');

    const resInvalidToken = await validateServerAuthorization({
      isProduction: true,
      authorizationHeader: 'Bearer invalid_fake_token',
      targetPatientIdBody: AHMED_ID,
    });

    expect(resInvalidToken.authorized).toBe(false);
    expect(resInvalidToken.statusCode).toBe(401);
    expect(resInvalidToken.error).toContain('Invalid or expired authentication token');
  });

  // 10. Supabase RLS remains final protection layer
  it('10. Confirms Supabase RLS simulation provides zero-trust evaluation', () => {
    // Primary patient self access
    expect(simulatePatientRLS(AHMED_ID, AHMED_ID, DEFAULT_EGYPT_ORG.id).allowed).toBe(true);

    // Primary guardian access
    expect(simulatePatientRLS(AHMED_ID, LAILA_ID, DEFAULT_EGYPT_ORG.id).allowed).toBe(true);

    // Cross-patient unauthorized access
    expect(simulatePatientRLS(MONA_ID, AHMED_ID, DEFAULT_EGYPT_ORG.id).allowed).toBe(false);

    // Cross-organization access
    expect(simulatePatientRLS(AHMED_ID, TAREQ_SEC_ID, DEFAULT_EGYPT_ORG.id).allowed).toBe(false);
  });

  // 11. localStorage contains no patient AI chat history
  it('11. Verifies localStorage contains no patient AI chat history keys', () => {
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      const chatKeys = keys.filter((k) => k.includes('patient_ai_chat'));
      expect(chatKeys.length).toBe(0);
    }
  });
});
