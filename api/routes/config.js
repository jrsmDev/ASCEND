/* api/routes/config.js — Public config, health check, and session routes
 *
 * Lightweight routes that need minimal dependencies.
 * Follows the same context-injection pattern as routes/admin.js.
 */

/**
 * @param {object} ctx - Shared dependencies injected by server.js
 */
export function configRoutes(ctx) {
  const {
    json, readSession, sessionOf, makeSession, publicUser, dataWritable,
    db, INVITE_ONLY, ALLOW_GUEST, PASSWORD_LOGIN, DEFAULT_LANG,
    MEDIA_ON, MEDIA_LIMITS, mediaConfig, coachConfig, SESSION_DAYS,
  } = ctx;

  return {
    'GET /api/health': async (_req, res) => {
      if (!dataWritable()) return json(res, 503, { ok: false, writable: false });
      json(res, 200, { ok: true, users: db.users.length, writable: true });
    },

    'GET /api/config': async (req, res) => {
      json(res, 200, {
        invite_only: INVITE_ONLY, allow_guest: ALLOW_GUEST,
        ...(PASSWORD_LOGIN ? { password_login: true } : {}),
        ...(DEFAULT_LANG ? { default_lang: DEFAULT_LANG } : {}),
        ...(MEDIA_ON ? { media: mediaConfig(MEDIA_LIMITS) } : {}),
        ...(readSession(req) ? { coach: coachConfig.publicConfig() } : {})
      });
    },

    'GET /api/me': async (req, res) => {
      const s = sessionOf(req);
      if (!s) return json(res, 401, { error: 'not signed in' });
      const { user } = s;
      const renew = s.bearer && s.kind !== 'c' && s.exp - Date.now() < SESSION_DAYS * 86400000 / 2;
      json(res, 200, { user: publicUser(user), ...(renew ? { token: makeSession(user) } : {}) });
    },
  };
}
