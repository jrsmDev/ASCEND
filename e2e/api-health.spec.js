// @ts-check
import { test, expect } from '@playwright/test';

/**
 * E2E: API Health & Config
 *
 * Verifies the API server is running and responds correctly.
 * These tests don't need a browser — they hit the API directly.
 */

test.describe('API Endpoints', () => {
  test('GET /api/health should return ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.writable).toBe(true);
    expect(typeof body.users).toBe('number');
  });

  test('GET /api/config should return instance configuration', async ({ request }) => {
    const res = await request.get('/api/config');
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    // These keys always exist
    expect(typeof body.invite_only).toBe('boolean');
    expect(typeof body.allow_guest).toBe('boolean');
  });

  test('GET /api/me without auth should return 401', async ({ request }) => {
    const res = await request.get('/api/me');
    expect(res.status()).toBe(401);

    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('GET /api/push/public-key should return VAPID key', async ({ request }) => {
    const res = await request.get('/api/push/public-key');
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(typeof body.key).toBe('string');
    expect(body.key.length).toBeGreaterThan(10);
  });

  test('PUT /api/data without auth should return 401', async ({ request }) => {
    const res = await request.put('/api/data', {
      data: {},
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status()).toBe(401);
  });

  test('unknown route should return 404', async ({ request }) => {
    const res = await request.get('/api/does-not-exist');
    expect(res.status()).toBe(404);
  });
});
