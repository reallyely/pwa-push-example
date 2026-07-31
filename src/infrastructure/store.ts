import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

export function dataFilePath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

// Returns undefined when the file is missing or unreadable, so a caller can
// distinguish "nothing persisted yet" from "persisted, but empty".
export function readJsonFile<T>(filePath: string): T | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (err) {
    console.error(`[store] failed to read ${filePath}, treating as absent`, err);
    return undefined;
  }
}

export function writeJsonFile<T>(filePath: string, data: T): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpFile = `${filePath}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, filePath);
}

export function readJsonMap<K, V>(filePath: string): Map<K, V> {
  return new Map(readJsonFile<[K, V][]>(filePath) ?? []);
}

export function writeJsonMap<K, V>(filePath: string, map: Map<K, V>): void {
  writeJsonFile(filePath, Array.from(map.entries()));
}
