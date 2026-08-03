import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenSurveyResponse } from './open-survey-response.js';
import { Survey, SurveyResponse } from 'domain/training';
import type { SurveyRepository, SurveyResponseRepository } from './ports.js';

function fakeSurveyRepository(survey: Survey | null): SurveyRepository {
  return {
    async findById() { return survey; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  } as unknown as SurveyRepository;
}

function fakeSurveyResponseRepository(existing: SurveyResponse | null): SurveyResponseRepository & { saved: SurveyResponse[] } {
  const saved: SurveyResponse[] = [];
  const repository = {
    async findById() { throw new Error('not used in this test'); },
    async findBySurveyAndUser() { return existing; },
    async findBySurveyId() { throw new Error('not used in this test'); },
    async save(surveyResponse: SurveyResponse) { saved.push(surveyResponse); },
  };
  return Object.assign(repository, { saved }) as unknown as SurveyResponseRepository & { saved: SurveyResponse[] };
}

const survey = Survey.schedule({ id: 's1', trainingId: 't1', sendDate: new Date('2026-09-01T10:00:00.000Z') });

describe('OpenSurveyResponse', () => {
  test('opens a new response when none exists yet', async () => {
    const surveyResponseRepository = fakeSurveyResponseRepository(null);
    const openSurveyResponse = new OpenSurveyResponse(fakeSurveyRepository(survey), surveyResponseRepository, () => 'sr1');

    const result = await openSurveyResponse.execute({ surveyId: 's1', userId: 'u1' });

    assert.equal(result.id, 'sr1');
    assert.equal(result.surveyId, 's1');
    assert.equal(result.userId, 'u1');
    assert.equal(surveyResponseRepository.saved.length, 1);
  });

  test('throws NOT_FOUND when the survey does not exist', async () => {
    const openSurveyResponse = new OpenSurveyResponse(fakeSurveyRepository(null), fakeSurveyResponseRepository(null), () => 'sr1');

    await assert.rejects(
      () => openSurveyResponse.execute({ surveyId: 'missing', userId: 'u1' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });

  test('is idempotent — returns the existing response instead of creating a second one', async () => {
    const existing = SurveyResponse.open({ id: 'sr1', surveyId: 's1', userId: 'u1', now: new Date() });
    const surveyResponseRepository = fakeSurveyResponseRepository(existing);
    const openSurveyResponse = new OpenSurveyResponse(fakeSurveyRepository(survey), surveyResponseRepository, () => 'sr2');

    const result = await openSurveyResponse.execute({ surveyId: 's1', userId: 'u1' });

    assert.equal(result, existing);
    assert.equal(surveyResponseRepository.saved.length, 0);
  });
});
