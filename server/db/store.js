import crypto from 'node:crypto';
import { products } from '../../shared/catalog.js';
import { DEFAULT_SETTINGS } from '../../shared/business.js';
import { transaction } from './database.js';
import { conflict, notFound } from '../lib/errors.js';
export const hash = (v) => crypto.createHash('sha256').update(v).digest('hex');
export function createStore(db) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO products(id,slug,sku,data,stock) VALUES(?,?,?,?,?)',
  );
  transaction(db, () => {
    for (const p of products) insert.run(p.id, p.slug, p.sku, JSON.stringify(p), p.stock);
    db.prepare('INSERT OR IGNORE INTO settings(id,data) VALUES(1,?)').run(
      JSON.stringify(DEFAULT_SETTINGS),
    );
  });
  const hydrate = (r) =>
    r ? { ...JSON.parse(r.data), stock: r.stock, reserved: r.reserved, version: r.version } : null;
  const hydrateOrder = (r) =>
    r
      ? {
          ...JSON.parse(r.data),
          status: r.state,
          sessionId: r.session_id,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }
      : null;
  const store = {
    db,
    tx: (fn) => transaction(db, fn),
    products: () => db.prepare('SELECT * FROM products ORDER BY rowid').all().map(hydrate),
    product: (id) => hydrate(db.prepare('SELECT * FROM products WHERE id=?').get(id)),
    saveProduct(p, actor) {
      return transaction(db, () => {
        const old = this.product(p.id);
        if (old && p.version !== old.version)
          throw conflict('concurrent_update', 'Product changed. Reload before saving.');
        if (old && p.stock < old.reserved)
          throw conflict('reserved_stock', 'Stock cannot be lower than reserved units.');
        if (old)
          db.prepare(
            'UPDATE products SET slug=?,sku=?,data=?,stock=?,version=version+1 WHERE id=?',
          ).run(p.slug, p.sku, JSON.stringify(p), p.stock, p.id);
        else
          db.prepare('INSERT INTO products(id,slug,sku,data,stock) VALUES(?,?,?,?,?)').run(
            p.id,
            p.slug,
            p.sku,
            JSON.stringify(p),
            p.stock,
          );
        this.audit(actor, old ? 'product.updated' : 'product.created', p.id);
        return this.product(p.id);
      });
    },
    archiveProduct(id, version, actor) {
      const p = this.product(id);
      if (!p) throw notFound();
      return this.saveProduct({ ...p, published: false, available: false, version }, actor);
    },
    settings() {
      const r = db.prepare('SELECT * FROM settings WHERE id=1').get();
      return { ...JSON.parse(r.data), version: r.version };
    },
    saveSettings(s, version, actor) {
      return transaction(db, () => {
        if (
          !db
            .prepare('UPDATE settings SET data=?,version=version+1 WHERE id=1 AND version=?')
            .run(JSON.stringify(s), version).changes
        )
          throw conflict('concurrent_update', 'Settings changed. Reload.');
        this.audit(actor, 'settings.updated', 'store');
        return this.settings();
      });
    },
    order: (number) =>
      hydrateOrder(db.prepare('SELECT * FROM commerce_orders WHERE number=?').get(number)),
    byId: (id) => hydrateOrder(db.prepare('SELECT * FROM commerce_orders WHERE id=?').get(id)),
    byKey: (key) =>
      hydrateOrder(db.prepare('SELECT * FROM commerce_orders WHERE idempotency_key=?').get(key)),
    bySession: (id) =>
      hydrateOrder(db.prepare('SELECT * FROM commerce_orders WHERE session_id=?').get(id)),
    reserveStock(line) {
      if (
        !db
          .prepare(
            'UPDATE products SET reserved=reserved+?,version=version+1 WHERE id=? AND stock-reserved>=?',
          )
          .run(line.quantity, line.productId, line.quantity).changes
      )
        throw conflict('out_of_stock', 'Not enough stock. Update your basket.');
    },
    releaseStock(line) {
      if (
        !db
          .prepare(
            'UPDATE products SET reserved=reserved-?,version=version+1 WHERE id=? AND reserved>=?',
          )
          .run(line.quantity, line.productId, line.quantity).changes
      )
        throw conflict('inventory_mismatch', 'Stock reconciliation required.');
    },
    sellStock(line) {
      if (
        !db
          .prepare(
            'UPDATE products SET stock=stock-?,reserved=reserved-?,version=version+1 WHERE id=? AND stock>=? AND reserved>=?',
          )
          .run(line.quantity, line.quantity, line.productId, line.quantity, line.quantity).changes
      )
        throw conflict('inventory_mismatch', 'Stock reconciliation required.');
    },
    paymentEventSeen: (id) => !!db.prepare('SELECT 1 FROM payment_events WHERE id=?').get(id),
    recordPaymentEvent: (id) =>
      db
        .prepare('INSERT OR IGNORE INTO payment_events(id,created_at) VALUES(?,?)')
        .run(id, new Date().toISOString()),
    orderByRefund(id) {
      const row = db
        .prepare("SELECT number FROM commerce_orders WHERE json_extract(data,'$.refundId')=?")
        .get(id);
      return row ? this.order(row.number) : null;
    },
    pendingOrders: (limit = 50) =>
      db
        .prepare(
          "SELECT * FROM commerce_orders WHERE state IN ('pending_payment','refund_pending') ORDER BY updated_at ASC LIMIT ?",
        )
        .all(limit)
        .map(hydrateOrder),
    touchOrder: (id) =>
      db
        .prepare('UPDATE commerce_orders SET updated_at=? WHERE id=?')
        .run(new Date().toISOString(), id),
    insertOrder(o, key, fp) {
      db.prepare(
        'INSERT INTO commerce_orders(id,number,idempotency_key,fingerprint,state,data,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)',
      ).run(o.id, o.orderNumber, key, fp, o.status, JSON.stringify(o), o.createdAt, o.createdAt);
    },
    updateOrder(o) {
      db.prepare(
        'UPDATE commerce_orders SET state=?,data=?,session_id=?,updated_at=? WHERE id=?',
      ).run(o.status, JSON.stringify(o), o.sessionId || null, new Date().toISOString(), o.id);
    },
    listOrders({ status = '', search = '', limit = 50, offset = 0 } = {}) {
      const clause =
        "WHERE (? = '' OR state=?) AND (? = '' OR number LIKE ? OR json_extract(data,'$.customer.email') LIKE ?)";
      const args = [status, status, search, '%' + search + '%', '%' + search + '%'];
      return {
        total: db.prepare('SELECT count(*) AS n FROM commerce_orders ' + clause).get(...args).n,
        orders: db
          .prepare(
            'SELECT * FROM commerce_orders ' +
              clause +
              ' ORDER BY created_at DESC LIMIT ? OFFSET ?',
          )
          .all(...args, limit, offset)
          .map(hydrateOrder),
      };
    },
    enqueue(id, kind, data) {
      db.prepare('INSERT OR IGNORE INTO outbox(id,kind,data,created_at) VALUES(?,?,?,?)').run(
        id,
        kind,
        JSON.stringify(data),
        new Date().toISOString(),
      );
    },
    audit(actor, action, entity) {
      db.prepare('INSERT INTO audit(actor,action,entity,at) VALUES(?,?,?,?)').run(
        actor,
        action,
        entity,
        new Date().toISOString(),
      );
    },
  };
  return store;
}
