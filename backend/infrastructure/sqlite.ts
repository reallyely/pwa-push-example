import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

let db: DatabaseSync | undefined;

// Single connection shared by every context's sqlite-*-repository.ts, all
// persisting into the one file on the Fly volume (DATA_DIR/app.db).
export function getDb(): DatabaseSync {
  if (!db) {
    const filePath = path.join(DATA_DIR, 'app.db');
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new DatabaseSync(filePath);
    db.exec('PRAGMA journal_mode = WAL');
  }
  return db;
}
