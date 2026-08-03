import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { Training, type Training as TrainingEntity } from 'domain/training';
import type { TrainingRepository } from '#training/application/ports.js';

export interface TrainingRecord {
  id: string;
  title: string;
  description: string | null;
  dateTime: string;
  trainerId: string;
}

function toEntity(record: TrainingRecord): TrainingEntity {
  return new Training({
    id: record.id,
    title: record.title,
    description: record.description ?? undefined,
    dateTime: new Date(record.dateTime),
    trainerId: record.trainerId,
  });
}

function toRecord(training: TrainingEntity): TrainingRecord {
  return {
    id: training.id,
    title: training.title,
    description: training.description ?? null,
    dateTime: training.dateTime.toISOString(),
    trainerId: training.trainerId,
  };
}

@Injectable()
export class SqliteTrainingRepository implements TrainingRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS trainings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        dateTime TEXT NOT NULL,
        trainerId TEXT NOT NULL
      )
    `);
  }

  async findById(id: string): Promise<TrainingEntity | null> {
    const row = this.db.prepare(`SELECT * FROM trainings WHERE id = ?`).get(id) as TrainingRecord | undefined;
    return row ? toEntity(row) : null;
  }

  async findAll(): Promise<TrainingEntity[]> {
    const rows = this.db.prepare(`SELECT * FROM trainings ORDER BY rowid`).all() as unknown as TrainingRecord[];
    return rows.map(toEntity);
  }

  async save(training: TrainingEntity): Promise<void> {
    const record = toRecord(training);
    this.db.prepare(`
      INSERT INTO trainings (id, title, description, dateTime, trainerId)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        dateTime = excluded.dateTime,
        trainerId = excluded.trainerId
    `).run(record.id, record.title, record.description, record.dateTime, record.trainerId);
  }
}
