import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { BlackoutWindow, type BlackoutWindow as BlackoutWindowEntity, type DayOfWeek } from 'domain/training';
import type { BlackoutWindowRepository } from '#training/application/ports.js';

export interface BlackoutWindowRecord {
  userId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

function toEntity(record: BlackoutWindowRecord): BlackoutWindowEntity {
  return new BlackoutWindow({
    dayOfWeek: record.dayOfWeek as DayOfWeek,
    startTime: record.startTime,
    endTime: record.endTime,
  });
}

@Injectable()
export class SqliteBlackoutWindowRepository implements BlackoutWindowRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS blackout_windows (
        userId TEXT NOT NULL,
        dayOfWeek TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT NOT NULL
      )
    `);
  }

  async findByUserId(userId: string): Promise<BlackoutWindowEntity[]> {
    const rows = this.db
      .prepare(`SELECT * FROM blackout_windows WHERE userId = ? ORDER BY rowid`)
      .all(userId) as unknown as BlackoutWindowRecord[];
    return rows.map(toEntity);
  }

  // Replaces the full list — no incremental add/remove use case exists yet.
  async save(userId: string, windows: BlackoutWindowEntity[]): Promise<void> {
    const deleteStmt = this.db.prepare(`DELETE FROM blackout_windows WHERE userId = ?`);
    const insertStmt = this.db.prepare(`
      INSERT INTO blackout_windows (userId, dayOfWeek, startTime, endTime)
      VALUES (?, ?, ?, ?)
    `);
    this.db.exec('BEGIN');
    try {
      deleteStmt.run(userId);
      for (const window of windows) {
        insertStmt.run(userId, window.dayOfWeek, window.startTime, window.endTime);
      }
      this.db.exec('COMMIT');
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }
}
