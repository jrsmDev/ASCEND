/* api/routes/admin.js — Admin dashboard routes extracted from server.js
 *
 * This module demonstrates the route-extraction pattern for the openGym API.
 * Each route module exports a function that receives shared dependencies (the "context")
 * and returns a plain object of `'METHOD /path': handler` entries, which server.js
 * spreads into the main routes table.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

/**
 * @param {object} ctx - Shared dependencies injected by server.js
 */
export function adminRoutes(ctx) {
  const {
    json, readBody, requireAdmin, requireOwner,
    isAdmin, isOwner, saveDb, audit, readState, records,
    lastSyncOf, livePresence, hasPassword, removeAccount, text,
    dropDeviceLinks, db, presence, PASSWORD_LOGIN, INVITE_ONLY,
    ADMIN_UIDS, auditConfig, auditLines, auditKeep, auditState,
    AUDIT_ON, AUDIT_IP, AUDIT_MAX, AUDIT_DAYS,
    auditFile, resetAuditCount,
  } = ctx;

  const isAuditOn = AUDIT_ON !== undefined ? AUDIT_ON : auditConfig?.AUDIT_ON;
  const auditIpMode = AUDIT_IP !== undefined ? AUDIT_IP : auditConfig?.AUDIT_IP;
  const auditMax = AUDIT_MAX !== undefined ? AUDIT_MAX : auditConfig?.AUDIT_MAX;
  const auditDays = AUDIT_DAYS !== undefined ? AUDIT_DAYS : auditConfig?.AUDIT_DAYS;
  const aFile = auditFile || auditState?.auditFile;

  return {
    /* ---------- admin dashboard ---------- */

    // One row per user, cheap enough for a personal instance (reads each state file once).
    'GET /api/admin/users': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const users = db.users.map(u => {
        const S = readState(u.id) || {};
        const workouts = records(S.workouts);
        const last = workouts[workouts.length - 1];
        return {
          id: u.id, name: u.name, created: u.created || null,
          disabled: !!u.disabled, admin: isAdmin(u), owner: isOwner(u), invitedBy: u.invitedBy || null,
          workouts: workouts.length,
          lastWorkout: last ? last.d : null,
          lastSync: lastSyncOf(u, S),
          hasPush: db.subs.some(s => s.userId === u.id),
          live: livePresence(u.id),
          ...(PASSWORD_LOGIN ? { password: hasPassword(u), email: u.email || null } : {})
        };
      });
      json(res, 200, { users, invite_only: INVITE_ONLY, ...(PASSWORD_LOGIN ? { password_login: true } : {}), now: Date.now() });
    },

    // Drill-down: full workout history + body-weight log for one user.
    'GET /api/admin/user': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const id = new URL(req.url, 'http://x').searchParams.get('id');
      const u = db.users.find(x => x.id === id);
      if (!u) return json(res, 404, { error: 'no such user' });
      const S = readState(u.id) || {};
      json(res, 200, {
        user: {
          id: u.id, name: u.name, created: u.created || null, disabled: !!u.disabled, admin: isAdmin(u), owner: isOwner(u), invitedBy: u.invitedBy || null,
          ...(PASSWORD_LOGIN ? { password: hasPassword(u), email: u.email || null, resetUntil: u.pwReset?.exp > Date.now() ? u.pwReset.exp : null } : {})
        },
        unit: S.unit || 'kg',
        lastSync: lastSyncOf(u, S),
        routines: records(S.routines).map(r => ({ id: r.id, name: r.name, emoji: r.emoji, count: records(r.ex).length })),
        bodyweight: records(S.bodyweight),
        workouts: records(S.workouts).reverse().map(({ media, ...w }) => w)
      });
    },

    'POST /api/admin/user/disable': async (req, res) => {
      const admin = requireAdmin(req, res); if (!admin) return;
      const body = await readBody(req);
      const u = db.users.find(x => x.id === body.id);
      if (!u) return json(res, 404, { error: 'no such user' });
      if (isAdmin(u)) return json(res, 400, { error: 'cannot disable an admin' });
      u.disabled = !!body.disabled;
      if (u.disabled) presence.delete(u.id);
      if (u.disabled) dropDeviceLinks(db, u.id);
      saveDb();
      audit(req, u.disabled ? 'admin.user.disable' : 'admin.user.enable', { user: admin, target: u });
      json(res, 200, { ok: true, id: u.id, disabled: u.disabled });
    },

    'POST /api/admin/user/delete': async (req, res) => {
      const admin = requireAdmin(req, res); if (!admin) return;
      const body = await readBody(req);
      const u = db.users.find(x => x.id === body.id);
      if (!u) return json(res, 404, { error: 'no such user' });
      if (u.id === admin.id) return json(res, 400, { error: 'you cannot delete your own account' });
      if (isAdmin(u) && db.users.filter(isAdmin).length <= 1) return json(res, 400, { error: 'cannot delete the last admin' });
      if (isOwner(u)) return json(res, 400, { error: 'the owner cannot be deleted; hand the role to another admin first' });
      if (isAdmin(u) && !isOwner(admin)) { audit(req, 'admin.denied', { ok: false, user: admin, target: u }); return json(res, 403, { error: 'only the owner can delete an admin' }); }
      const name = u.name;
      removeAccount(u);
      audit(req, 'admin.user.delete', { user: admin, msg: name });
      json(res, 200, { ok: true, id: u.id });
    },

    'POST /api/admin/user/role': async (req, res) => {
      const owner = requireOwner(req, res); if (!owner) return;
      const body = await readBody(req);
      const u = db.users.find(x => x.id === body.id);
      if (!u) return json(res, 404, { error: 'no such user' });
      if (u.id === owner.id) return json(res, 400, { error: 'the owner stays an admin' });
      if (typeof body.admin !== 'boolean') return json(res, 400, { error: 'admin must be true or false' });
      if (ADMIN_UIDS.includes(u.id)) return json(res, 400, { error: 'this admin is set in ADMIN_UIDS on the server' });
      if (body.admin && u.disabled) return json(res, 400, { error: 'enable the account first' });
      if (body.admin) u.admin = true; else { delete u.admin; delete u.owner; }
      saveDb();
      audit(req, body.admin ? 'admin.role.grant' : 'admin.role.revoke', { user: owner, target: u });
      json(res, 200, { ok: true, id: u.id, admin: isAdmin(u) });
    },

    'POST /api/admin/owner': async (req, res) => {
      const owner = requireOwner(req, res); if (!owner) return;
      const body = await readBody(req);
      const u = db.users.find(x => x.id === body.id);
      if (!u) return json(res, 404, { error: 'no such user' });
      if (u.id === owner.id) return json(res, 400, { error: 'you already are the owner' });
      if (!isAdmin(u) || u.disabled) return json(res, 400, { error: 'make them an admin first' });
      for (const x of db.users) delete x.owner;
      u.owner = true;
      saveDb();
      audit(req, 'admin.owner.transfer', { user: owner, target: u });
      json(res, 200, { ok: true, id: u.id });
    },

    'GET /api/admin/invites': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const invites = db.invites.map(i => ({
        ...i, usedByName: i.usedBy ? (db.users.find(u => u.id === i.usedBy) || {}).name || null : null
      }));
      json(res, 200, { invites, invite_only: INVITE_ONLY });
    },

    'POST /api/admin/invites/new': async (req, res) => {
      const admin = requireAdmin(req, res); if (!admin) return;
      const body = await readBody(req);
      let code;
      do { code = crypto.randomBytes(8).toString('hex').toUpperCase(); } while (db.invites.some(i => i.code === code));
      const invite = { code, note: text(body.note).slice(0, 60), createdBy: admin.id, created: new Date().toISOString() };
      db.invites.push(invite);
      saveDb();
      audit(req, 'admin.invite.create', { user: admin, msg: code });
      json(res, 200, { invite });
    },

    'POST /api/admin/invites/revoke': async (req, res) => {
      const admin = requireAdmin(req, res); if (!admin) return;
      const body = await readBody(req);
      const inv = db.invites.find(i => i.code === text(body.code).toUpperCase());
      if (!inv) return json(res, 404, { error: 'no such code' });
      if (inv.usedBy) return json(res, 400, { error: 'already used, cannot revoke' });
      db.invites = db.invites.filter(i => i.code !== inv.code);
      saveDb();
      audit(req, 'admin.invite.revoke', { user: admin, msg: inv.code });
      json(res, 200, { ok: true });
    },

    /* ---------- activity log ---------- */
    'GET /api/admin/audit': async (req, res) => {
      if (!requireAdmin(req, res)) return;
      const q = new URL(req.url, 'http://x').searchParams;
      const limit = Math.max(1, Math.min(200, +q.get('limit') || 100));
      const before = +q.get('before') || Infinity;
      const cat = q.get('cat') || '';
      let rows = auditKeep(auditLines()).reverse();
      if (cat === 'fail') rows = rows.filter(r => !r.ok);
      else if (cat) rows = rows.filter(r => String(r.ev).startsWith(cat + '.'));
      const page = rows.filter(r => r.id < before).slice(0, limit);
      json(res, 200, {
        events: page,
        total: rows.length,
        nextBefore: page.length === limit ? page[page.length - 1].id : null,
        enabled: isAuditOn, ip_mode: auditIpMode,
        retention: { max: auditMax, days: auditDays },
        now: Date.now()
      });
    },

    'POST /api/admin/audit/clear': async (req, res) => {
      const admin = requireOwner(req, res); if (!admin) return;
      try { if (aFile) fs.unlinkSync(aFile); } catch { /* nothing logged yet */ }
      if (typeof resetAuditCount === 'function') resetAuditCount();
      else if (auditState?.setCount) auditState.setCount(0);
      audit(req, 'admin.audit.clear', { user: admin });
      json(res, 200, { ok: true });
    },
  };
}
