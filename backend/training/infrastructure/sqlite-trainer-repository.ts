import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { Trainer, type Trainer as TrainerEntity } from 'domain/training';
import type { TrainerRepository } from '#training/application/ports.js';

export interface TrainerRecord {
  id: string;
  name: string;
}

function toEntity(record: TrainerRecord): TrainerEntity {
  return new Trainer({
    id: record.id,
    name: record.name,
  });
}

function toRecord(trainer: TrainerEntity): TrainerRecord {
  return {
    id: trainer.id,
    name: trainer.name,
  };
}

@Injectable()
export class SqliteTrainerRepository implements TrainerRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trainers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);
  }

  async findById(id: string): Promise<TrainerEntity | null> {
    const row = this.db.prepare(`SELECT * FROM trainers WHERE id = ?`).get(id) as TrainerRecord | undefined;
    return row ? toEntity(row) : null;
  }

  async findAll(): Promise<TrainerEntity[]> {
    const rows = this.db.prepare(`SELECT * FROM trainers ORDER BY rowid`).all() as unknown as TrainerRecord[];
    return rows.map(toEntity);
  }

  async save(trainer: TrainerEntity): Promise<void> {
    const record = toRecord(trainer);
    this.db.prepare(`
      INSERT INTO trainers (id, name)
      VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name
    `).run(record.id, record.name);
  }
}
