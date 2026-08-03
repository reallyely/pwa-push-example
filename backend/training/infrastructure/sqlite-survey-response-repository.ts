import { Injectable } from '@nestjs/common';
import { getDb } from '#sqlite';
import {
  SurveyResponse,
  type Answer,
  type ResourceAccess,
  type SurveyResponseStatus,
  type SurveyResponse as SurveyResponseEntity,
} from 'domain/training';
import type { SurveyResponseRepository } from '#training/application/ports.js';

export interface SurveyResponseRecord {
  id: string;
  surveyId: string;
  userId: string;
  openedTime: string;
  finishedTime: string | null;
  answers: string;
  resourceAccesses: string;
  state: string;
}

interface ResourceAccessRecord {
  resourceId: string;
  accessedTime: string;
}

function toEntity(record: SurveyResponseRecord): SurveyResponseEntity {
  const resourceAccesses: ResourceAccess[] = (JSON.parse(record.resourceAccesses) as ResourceAccessRecord[]).map((access) => ({
    resourceId: access.resourceId,
    accessedTime: new Date(access.accessedTime),
  }));
  return new SurveyResponse({
    id: record.id,
    surveyId: record.surveyId,
    userId: record.userId,
    status: record.state as SurveyResponseStatus,
    openedTime: new Date(record.openedTime),
    finishedTime: record.finishedTime ? new Date(record.finishedTime) : null,
    answers: JSON.parse(record.answers) as Answer[],
    resourceAccesses,
  });
}

function toRecord(surveyResponse: SurveyResponseEntity): SurveyResponseRecord {
  const resourceAccesses: ResourceAccessRecord[] = surveyResponse.resourceAccesses.map((access) => ({
    resourceId: access.resourceId,
    accessedTime: access.accessedTime.toISOString(),
  }));
  return {
    id: surveyResponse.id,
    surveyId: surveyResponse.surveyId,
    userId: surveyResponse.userId,
    openedTime: surveyResponse.openedTime.toISOString(),
    finishedTime: surveyResponse.finishedTime ? surveyResponse.finishedTime.toISOString() : null,
    answers: JSON.stringify(surveyResponse.answers),
    resourceAccesses: JSON.stringify(resourceAccesses),
    state: surveyResponse.status,
  };
}

@Injectable()
export class SqliteSurveyResponseRepository implements SurveyResponseRepository {
  private db = getDb();

  constructor() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id TEXT PRIMARY KEY,
        surveyId TEXT NOT NULL,
        userId TEXT NOT NULL,
        openedTime TEXT NOT NULL,
        finishedTime TEXT,
        answers TEXT NOT NULL,
        resourceAccesses TEXT NOT NULL,
        state TEXT NOT NULL
      )
    `);
  }

  async findById(id: string): Promise<SurveyResponseEntity | null> {
    const row = this.db.prepare(`SELECT * FROM survey_responses WHERE id = ?`).get(id) as SurveyResponseRecord | undefined;
    return row ? toEntity(row) : null;
  }

  async findBySurveyAndUser(surveyId: string, userId: string): Promise<SurveyResponseEntity | null> {
    const row = this.db
      .prepare(`SELECT * FROM survey_responses WHERE surveyId = ? AND userId = ?`)
      .get(surveyId, userId) as SurveyResponseRecord | undefined;
    return row ? toEntity(row) : null;
  }

  async findBySurveyId(surveyId: string): Promise<SurveyResponseEntity[]> {
    const rows = this.db
      .prepare(`SELECT * FROM survey_responses WHERE surveyId = ? ORDER BY rowid`)
      .all(surveyId) as unknown as SurveyResponseRecord[];
    return rows.map(toEntity);
  }

  async save(surveyResponse: SurveyResponseEntity): Promise<void> {
    const record = toRecord(surveyResponse);
    this.db.prepare(`
      INSERT INTO survey_responses (id, surveyId, userId, openedTime, finishedTime, answers, resourceAccesses, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        surveyId = excluded.surveyId,
        userId = excluded.userId,
        openedTime = excluded.openedTime,
        finishedTime = excluded.finishedTime,
        answers = excluded.answers,
        resourceAccesses = excluded.resourceAccesses,
        state = excluded.state
    `).run(
      record.id,
      record.surveyId,
      record.userId,
      record.openedTime,
      record.finishedTime,
      record.answers,
      record.resourceAccesses,
      record.state,
    );
  }
}
