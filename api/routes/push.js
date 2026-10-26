/* api/routes/push.js — Push notification routes extracted from server.js
 *
 * Manages Web Push subscriptions, rest-timer alerts, and push testing.
 */

import crypto from 'node:crypto';

/**
 * @param {object} ctx - Shared dependencies injected by server.js
 */
export function pushRoutes(ctx) {
  const {
    json, readBody, readSession,
    db, saveDb, vapid, sendPush,
    scheduleRestTimer, cancelRestTimer, deviceIdOf,
    pushEndpointError, MAX_SUBS_PER_USER,
    pushThrottled, PUSH_TESTS, REST_TIMER_SETS,
    testPush, readStateCached,
  } = ctx;

  return {
    'GET /api/push/public-key': async (_req, res) => json(res, 200, { key: vapid.publicKey }),

    'POST /api/push/subscribe': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      const body = await readBody(req);
      const sub = body.subscription;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return json(res, 400, { error: 'invalid subscription' });
      const bad = pushEndpointError(sub.endpoint);
      if (bad) return json(res, 400, { error: bad });

      const keys = { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) };
      const deviceId = deviceIdOf(body.deviceId);

      const keyDigest = k => crypto.createHash('sha256').update(`${k?.p256dh}\n${k?.auth}`).digest();
      const sameKeys = k => crypto.timingSafeEqual(keyDigest(k), keyDigest(keys));
      if (db.subs.some(s => s.endpoint === sub.endpoint && s.userId !== user.id && !sameKeys(s.keys))) {
        return json(res, 409, { error: 'this subscription belongs to another account' });
      }
      const prev = db.subs.find(s => s.endpoint === sub.endpoint);
      const storedDevice = deviceId || prev?.deviceId;
      db.subs = db.subs.filter(s => s.endpoint !== sub.endpoint);

      const mine = db.subs.filter(s => s.userId === user.id);
      if (mine.length >= MAX_SUBS_PER_USER) {
        const drop = new Set(mine.slice(0, mine.length - MAX_SUBS_PER_USER + 1).map(s => s.endpoint));
        db.subs = db.subs.filter(s => !drop.has(s.endpoint));
      }
      db.subs.push({ userId: user.id, endpoint: sub.endpoint, keys, ...(storedDevice ? { deviceId: storedDevice } : {}), created: prev?.created || new Date().toISOString() });
      saveDb();
      json(res, 200, { ok: true });
    },

    'GET /api/push/status': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      const endpoint = new URL(req.url, 'http://x').searchParams.get('endpoint') || '';
      const row = db.subs.find(s => s.userId === user.id && s.endpoint === endpoint);
      json(res, 200, row ? { subscribed: true, deviceId: row.deviceId || null } : { subscribed: false });
    },

    'POST /api/push/unsubscribe': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      const body = await readBody(req);
      db.subs = db.subs.filter(s => !(s.userId === user.id && s.endpoint === body.endpoint));
      saveDb();
      json(res, 200, { ok: true });
    },

    'POST /api/push/test': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      if (pushThrottled(res, PUSH_TESTS, user)) return;
      await sendPush(user.id, testPush(readStateCached(user.id)?.lang));
      json(res, 200, { ok: true });
    },

    'POST /api/push/rest-timer': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      if (pushThrottled(res, REST_TIMER_SETS, user)) return;
      const body = await readBody(req);
      const raw = body.seconds;
      const n = typeof raw === 'number' || typeof raw === 'string' ? Number(raw) : NaN;
      if (!(n >= 1)) return json(res, 400, { error: 'seconds required' });
      const sec = Math.min(3600, Math.round(n));
      scheduleRestTimer(user.id, deviceIdOf(body.deviceId), sec, readStateCached(user.id)?.lang);
      json(res, 200, { ok: true });
    },

    'POST /api/push/rest-timer/cancel': async (req, res) => {
      const user = readSession(req);
      if (!user) return json(res, 401, { error: 'not signed in' });
      const body = await readBody(req);
      cancelRestTimer(user.id, deviceIdOf(body.deviceId));
      json(res, 200, { ok: true });
    },
  };
}
