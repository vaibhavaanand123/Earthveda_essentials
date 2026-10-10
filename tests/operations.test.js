import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openDatabase } from '../server/db/database.js';
import { createStore } from '../server/db/store.js';
import { createNotificationWorker, emailFor } from '../server/services/notifications.js';
import { silentLogger } from '../server/lib/logger.js';
const config = {
  RESEND_API_KEY: 're_fixture',
  EMAIL_FROM: 'Fixture <sender@example.com>',
  publicSiteUrl: 'https://example.com',
};
const queue = (s) =>
  s.enqueue('persistent-job', 'newsletter-confirm', {
    to: 'fixture@example.com',
    language: 'de',
    token: 'fixture-token',
  });
test('products, settings and leased notification work survive a database restart', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'earthveda-restart-'));
  let db;
  try {
    const filename = path.join(dir, 'store.sqlite');
    db = openDatabase(filename);
    let s = createStore(db);
    const p = s.product('peri-peri');
    s.saveProduct({ ...p, stock: 17 }, 'fixture');
    const settings = s.settings();
    s.saveSettings(
      { ...settings, story: { de: 'Geschichte', en: 'Story' } },
      settings.version,
      'fixture',
    );
    queue(s);
    db.prepare(
      "UPDATE outbox SET state='processing',attempts=1,lease_until=0 WHERE id='persistent-job'",
    ).run();
    db.close();
    db = openDatabase(filename);
    s = createStore(db);
    assert.equal(s.product(p.id).stock, 17);
    assert.equal(s.settings().story.en, 'Story');
    let requests = 0;
    const worker = createNotificationWorker(s, config, silentLogger, {
      fetcher: async (_url, opts) => {
        requests++;
        assert.equal(opts.headers['Idempotency-Key'], 'persistent-job');
        return new Response('{}', { status: 200 });
      },
    });
    await worker.drain();
    assert.equal(requests, 1);
    assert.equal(
      db.prepare("SELECT state FROM outbox WHERE id='persistent-job'").get().state,
      'sent',
    );
    await worker.drain();
    assert.equal(requests, 1);
  } finally {
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('provider failures retry with a stable key, dead-letter after ten attempts, and recover', async () => {
  const db = openDatabase(':memory:');
  try {
    const s = createStore(db);
    queue(s);
    let fail = true;
    const keys = [];
    const w = createNotificationWorker(s, config, silentLogger, {
      fetcher: async (_url, opts) => {
        keys.push(opts.headers['Idempotency-Key']);
        return new Response('{}', { status: fail ? 503 : 200 });
      },
    });
    for (let n = 0; n < 10; n++) {
      db.prepare("UPDATE outbox SET next_at=0 WHERE id='persistent-job'").run();
      await w.drain();
    }
    const job = db.prepare("SELECT * FROM outbox WHERE id='persistent-job'").get();
    assert.equal(job.state, 'failed');
    assert.equal(job.attempts, 10);
    assert.match(job.last_error, /503/);
    await w.drain();
    assert.equal(keys.length, 10);
    fail = false;
    db.prepare(
      "UPDATE outbox SET state='pending',attempts=0,next_at=0 WHERE id='persistent-job'",
    ).run();
    await w.drain();
    assert.equal(
      db.prepare("SELECT state FROM outbox WHERE id='persistent-job'").get().state,
      'sent',
    );
    assert.equal(new Set(keys).size, 1);
  } finally {
    db.close();
  }
});
test('online backup is readable and preserves committed data while the database is open', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'earthveda-backup-'));
  let db, copy;
  try {
    const filename = path.join(dir, 'store.sqlite');
    db = openDatabase(filename);
    const s = createStore(db);
    const p = s.product('peri-peri');
    s.saveProduct({ ...p, stock: 23 }, 'fixture');
    queue(s);
    execFileSync(
      process.execPath,
      [
        '--disable-warning=ExperimentalWarning',
        'server/scripts/backup.js',
        path.join(dir, 'backups'),
      ],
      { cwd: process.cwd(), env: { ...process.env, DATABASE_PATH: filename } },
    );
    const backup = fs.readdirSync(path.join(dir, 'backups'))[0];
    copy = openDatabase(path.join(dir, 'backups', backup));
    const restored = createStore(copy);
    assert.equal(restored.product(p.id).stock, 23);
    assert.equal(copy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(copy.prepare('SELECT count(*) AS n FROM outbox').get().n, 1);
  } finally {
    copy?.close();
    db?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test('emails escape untrusted markup and expose a separate unsubscribe action', () => {
  const msg = emailFor(
    { kind: 'newsletter-confirm', data: { language: 'de', token: 'test-token' } },
    { legalName: '<script>alert(1)</script>', address: 'Test', email: 'x@example.com' },
    config,
  );
  assert.ok(!msg.html.includes('<script>'));
  assert.ok(msg.html.includes('&lt;script&gt;'));
  assert.ok(msg.html.includes('/unsubscribe?token=test-token'));
});
