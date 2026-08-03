import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import type { TrainingEnrollmentRepository } from '#training/application/ports.js';

export interface TrainingParticipantRecord {
  trainingId: string;
  userId: string;
}

@Injectable()
export class SqliteTrainingEnrollmentRepository implements TrainingEnrollmentRepository {
  private db = getDb();

  // Table name keeps domain-model.md's PARTICIPANT ER label for continuity
  // even though there's no Participant type in code — it's just what's
  // enrolled.
  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS training_participants (
        trainingId TEXT NOT NULL,
        userId TEXT NOT NULL,
        PRIMARY KEY (trainingId, userId)
      )
    `);
  }

  async enroll(trainingId: string, userId: string): Promise<void> {
    this.db.prepare(`
      INSERT INTO training_participants (trainingId, userId)
      VALUES (?, ?)
      ON CONFLICT(trainingId, userId) DO NOTHING
    `).run(trainingId, userId);
  }

  async findTrainingIdsByUser(userId: string): Promise<string[]> {
    const rows = this.db
      .prepare(`SELECT trainingId FROM training_participants WHERE userId = ? ORDER BY rowid`)
      .all(userId) as unknown as TrainingParticipantRecord[];
    return rows.map((row) => row.trainingId);
  }

  async findUserIdsByTraining(trainingId: string): Promise<string[]> {
    const rows = this.db
      .prepare(`SELECT userId FROM training_participants WHERE trainingId = ? ORDER BY rowid`)
      .all(trainingId) as unknown as TrainingParticipantRecord[];
    return rows.map((row) => row.userId);
  }
}
