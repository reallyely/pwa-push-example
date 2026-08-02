import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import { Question, type AnswerFormat, type Question as QuestionEntity } from 'domain/training';
import type { QuestionRepository } from '#training/application/ports.js';

export interface QuestionRecord {
  id: string;
  prompt: string;
  answerFormat: string;
}

function toEntity(record: QuestionRecord): QuestionEntity {
  return new Question({
    id: record.id,
    prompt: record.prompt,
    answerFormat: JSON.parse(record.answerFormat) as AnswerFormat,
  });
}

function toRecord(question: QuestionEntity): QuestionRecord {
  return {
    id: question.id,
    prompt: question.prompt,
    answerFormat: JSON.stringify(question.answerFormat),
  };
}

@Injectable()
export class SqliteQuestionRepository implements QuestionRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        answerFormat TEXT NOT NULL
      )
    `);
  }

  async findById(id: string): Promise<QuestionEntity | null> {
    const row = this.db.prepare(`SELECT * FROM questions WHERE id = ?`).get(id) as QuestionRecord | undefined;
    return row ? toEntity(row) : null;
  }

  async findAll(): Promise<QuestionEntity[]> {
    const rows = this.db.prepare(`SELECT * FROM questions ORDER BY rowid`).all() as unknown as QuestionRecord[];
    return rows.map(toEntity);
  }

  async save(question: QuestionEntity): Promise<void> {
    const record = toRecord(question);
    this.db.prepare(`
      INSERT INTO questions (id, prompt, answerFormat)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        prompt = excluded.prompt,
        answerFormat = excluded.answerFormat
    `).run(record.id, record.prompt, record.answerFormat);
  }
}
