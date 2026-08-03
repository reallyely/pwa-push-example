import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { Survey, type SurveyQuestion, type Resource, type Survey as SurveyEntity } from 'domain/training';
import type { SurveyRepository } from '#training/application/ports.js';

export interface SurveyRecord {
  id: string;
  trainingId: string;
  sendDate: string;
  questions: string;
  resources: string;
}

function toEntity(record: SurveyRecord): SurveyEntity {
  return new Survey({
    id: record.id,
    trainingId: record.trainingId,
    sendDate: new Date(record.sendDate),
    questions: JSON.parse(record.questions) as SurveyQuestion[],
    resources: JSON.parse(record.resources) as Resource[],
  });
}

function toRecord(survey: SurveyEntity): SurveyRecord {
  return {
    id: survey.id,
    trainingId: survey.trainingId,
    sendDate: survey.sendDate.toISOString(),
    questions: JSON.stringify(survey.questions),
    resources: JSON.stringify(survey.resources),
  };
}

@Injectable()
export class SqliteSurveyRepository implements SurveyRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS surveys (
        id TEXT PRIMARY KEY,
        trainingId TEXT NOT NULL,
        sendDate TEXT NOT NULL,
        questions TEXT NOT NULL,
        resources TEXT NOT NULL
      )
    `);
  }

  async findById(id: string): Promise<SurveyEntity | null> {
    const row = this.db.prepare(`SELECT * FROM surveys WHERE id = ?`).get(id) as SurveyRecord | undefined;
    return row ? toEntity(row) : null;
  }

  async findAll(): Promise<SurveyEntity[]> {
    const rows = this.db.prepare(`SELECT * FROM surveys ORDER BY rowid`).all() as unknown as SurveyRecord[];
    return rows.map(toEntity);
  }

  async save(survey: SurveyEntity): Promise<void> {
    const record = toRecord(survey);
    this.db.prepare(`
      INSERT INTO surveys (id, trainingId, sendDate, questions, resources)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        trainingId = excluded.trainingId,
        sendDate = excluded.sendDate,
        questions = excluded.questions,
        resources = excluded.resources
    `).run(record.id, record.trainingId, record.sendDate, record.questions, record.resources);
  }
}
