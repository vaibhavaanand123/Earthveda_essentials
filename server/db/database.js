import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Ordered, append-only migrations. Never edit a shipped migration; add a new
 * one. The applied version is tracked in SQLite's `user_version` pragma.
 */
const MIGRATIONS = [
  `
  CREATE TABLE orders (
    id               TEXT PRIMARY KEY,
    order_number     TEXT NOT NULL UNIQUE,
    idempotency_key  TEXT NOT NULL UNIQUE,
    fingerprint      TEXT NOT NULL,
    market           TEXT NOT NULL,
    currency         TEXT NOT NULL,
    status           TEXT NOT NULL,
    payment_method   TEXT NOT NULL,
    subtotal         INTEGER NOT NULL CHECK (subtotal >= 0),
    shipping         INTEGER NOT NULL CHECK (shipping >= 0),
    total            INTEGER NOT NULL CHECK (total >= 0),
    first_name       TEXT NOT NULL,
    last_name        TEXT NOT NULL,
    email            TEXT,
    phone            TEXT NOT NULL,
    phone_digits     TEXT NOT NULL,
    street           TEXT NOT NULL,
    unit             TEXT,
    landmark         TEXT,
    postal_code      TEXT NOT NULL,
    city             TEXT NOT NULL,
    note             TEXT,
    whatsapp_opt_in  INTEGER NOT NULL DEFAULT 0,
    client_ip_hash   TEXT,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );
  CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);
  CREATE INDEX idx_orders_created ON orders (created_at DESC);
  CREATE INDEX idx_orders_phone ON orders (phone_digits);

  CREATE TABLE order_lines (
    order_id    TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    product_id  TEXT NOT NULL,
    sku         TEXT NOT NULL,
    name        TEXT NOT NULL,
    unit_price  INTEGER NOT NULL CHECK (unit_price >= 0),
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    line_total  INTEGER NOT NULL CHECK (line_total >= 0),
    PRIMARY KEY (order_id, position)
  );

  CREATE TABLE order_events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    from_status  TEXT,
    to_status    TEXT NOT NULL,
    note         TEXT,
    actor        TEXT NOT NULL,
    created_at   TEXT NOT NULL
  );
  CREATE INDEX idx_order_events_order ON order_events (order_id, id);

  CREATE TABLE product_overrides (
    product_id  TEXT PRIMARY KEY,
    available   INTEGER NOT NULL,
    updated_at  TEXT NOT NULL
  );
  `,
  `
  CREATE TABLE products (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, sku TEXT NOT NULL UNIQUE, data TEXT NOT NULL, stock INTEGER NOT NULL CHECK(stock >= 0), reserved INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0), version INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE commerce_orders (id TEXT PRIMARY KEY, number TEXT NOT NULL UNIQUE, idempotency_key TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL, state TEXT NOT NULL, data TEXT NOT NULL, session_id TEXT UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE INDEX commerce_order_state ON commerce_orders(state, created_at);
  CREATE TABLE payment_events (id TEXT PRIMARY KEY, created_at TEXT NOT NULL);
  CREATE TABLE outbox (id TEXT PRIMARY KEY, kind TEXT NOT NULL, data TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL DEFAULT 0, lease_until INTEGER NOT NULL DEFAULT 0, last_error TEXT, created_at TEXT NOT NULL);
  CREATE INDEX outbox_pending ON outbox(state, next_at);
  CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE staff (email TEXT PRIMARY KEY, password_hash TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
  CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL REFERENCES staff(email), expires_at INTEGER NOT NULL);
  CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, at TEXT NOT NULL);
  CREATE TABLE subscribers (email TEXT PRIMARY KEY, language TEXT NOT NULL, state TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, confirmed_at TEXT, consent_at TEXT NOT NULL, policy_version TEXT NOT NULL);
  CREATE TABLE withdrawals (id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, data TEXT NOT NULL, created_at TEXT NOT NULL);
  `,
  `CREATE INDEX commerce_order_reconciliation ON commerce_orders(state, updated_at);
   CREATE INDEX outbox_lease ON outbox(state, lease_until);`,
];

export function openDatabase(filename) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
  `);
  migrate(db);
  return db;
}

function migrate(db) {
  const current = db.prepare('PRAGMA user_version').get().user_version;
  for (let version = current; version < MIGRATIONS.length; version += 1) {
    transaction(db, () => {
      db.exec(MIGRATIONS[version]);
      db.exec(`PRAGMA user_version = ${version + 1}`);
    });
  }
}

/** Run `fn` inside BEGIN IMMEDIATE / COMMIT, rolling back on any error. */
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
