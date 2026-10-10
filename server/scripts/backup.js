/**
 * Consistent online backup of the order database (safe while the server runs).
 *   node server/scripts/backup.js [destination-dir]
 * Schedule it (cron / platform job) and copy the file off the machine.
 */
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

process.umask(0o077);
const source = path.resolve(process.env.DATABASE_PATH || './data/earthveda.sqlite');
const dir = path.resolve(process.argv[2] || './backups');
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, `earthveda-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
const db = new DatabaseSync(source, { readOnly: true });
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
db.close();
console.log(`Backup written to ${target}`);
