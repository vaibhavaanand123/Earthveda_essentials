import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { hash } from '../db/store.js';
import { AppError, unauthorized } from '../lib/errors.js';
const scrypt = promisify(crypto.scrypt);
export async function passwordHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}
async function verify(password, stored) {
  const [salt, key] = stored.split(':');
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(key, 'hex');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}
export function createAuth(store, config) {
  const dummy = passwordHash('never-a-valid-password-' + crypto.randomBytes(20).toString('hex'));
  return {
    async bootstrap() {
      if (
        config.ADMIN_BOOTSTRAP_EMAIL &&
        config.ADMIN_BOOTSTRAP_PASSWORD &&
        !store.db.prepare('SELECT 1 FROM staff LIMIT 1').get()
      ) {
        store.db
          .prepare('INSERT INTO staff(email,password_hash,role) VALUES(?,?,?)')
          .run(
            config.ADMIN_BOOTSTRAP_EMAIL.toLowerCase(),
            await passwordHash(config.ADMIN_BOOTSTRAP_PASSWORD),
            'owner',
          );
      }
    },
    async login(email, password) {
      const row = store.db.prepare('SELECT * FROM staff WHERE email=?').get(email.toLowerCase());
      const ok = await verify(password, row?.password_hash || (await dummy));
      if (!row?.active || !ok) throw unauthorized();
      const token = crypto.randomBytes(32).toString('base64url');
      store.db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());
      store.db
        .prepare('INSERT INTO sessions(token_hash,email,expires_at) VALUES(?,?,?)')
        .run(hash(token), row.email, Date.now() + 8 * 3600000);
      store.audit(row.email, 'staff.login', 'session');
      return { token, user: { email: row.email, role: row.role } };
    },
    middleware(role) {
      return (req, _res, next) => {
        const token =
          req.headers.cookie
            ?.split(';')
            .find((c) => c.trim().startsWith('ev_session='))
            ?.trim()
            .slice(11) || '';
        const row = store.db
          .prepare(
            'SELECT staff.email,staff.role,staff.active,sessions.expires_at FROM sessions JOIN staff ON staff.email=sessions.email WHERE token_hash=?',
          )
          .get(hash(token));
        if (!row?.active || row.expires_at < Date.now()) return next(unauthorized());
        if (role && row.role !== 'owner' && row.role !== role)
          return next(new AppError(403, 'forbidden', 'This action needs an owner account.'));
        req.user = { email: row.email, role: row.role };
        req.sessionHash = hash(token);
        next();
      };
    },
    async createUser({ email, password, role }, actor) {
      const normalized = email.toLowerCase();
      if (store.db.prepare('SELECT 1 FROM staff WHERE email=?').get(normalized))
        throw new AppError(409, 'exists', 'Staff account already exists.');
      store.db
        .prepare('INSERT INTO staff(email,password_hash,role) VALUES(?,?,?)')
        .run(normalized, await passwordHash(password), role);
      store.audit(actor, 'staff.created', normalized);
    },
    disableUser(email, actor) {
      if (email === actor)
        throw new AppError(409, 'self_disable', 'Use another owner to disable your account.');
      const u = store.db.prepare('SELECT role FROM staff WHERE email=?').get(email);
      if (
        u?.role === 'owner' &&
        store.db.prepare("SELECT count(*) AS n FROM staff WHERE role='owner' AND active=1").get()
          .n <= 1
      )
        throw new AppError(409, 'last_owner', 'Keep at least one active owner.');
      store.tx(() => {
        store.db.prepare('UPDATE staff SET active=0 WHERE email=?').run(email);
        store.db.prepare('DELETE FROM sessions WHERE email=?').run(email);
        store.audit(actor, 'staff.disabled', email);
      });
    },
  };
}
