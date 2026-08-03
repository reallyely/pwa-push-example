import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GetSurvey } from './get-survey.js';
import { Survey } from 'domain/training';
import type { SurveyRepository } from './ports.js';

function fakeRepository(survey: Survey | null): SurveyRepository {
  return {
    async findById() { return survey; },
    async findAll() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  } as unknown as SurveyRepository;
}

describe('GetSurvey', () => {
  test('returns the survey when found', async () => {
    const survey = Survey.schedule({ id: 's1', trainingId: 't1', sendDate: new Date('2026-09-01T10:00:00.000Z') });
    const getSurvey = new GetSurvey(fakeRepository(survey));

    const result = await getSurvey.execute({ surveyId: 's1' });

    assert.equal(result, survey);
  });

  test('throws NOT_FOUND when no survey has that id', async () => {
    const getSurvey = new GetSurvey(fakeRepository(null));

    await assert.rejects(
      () => getSurvey.execute({ surveyId: 'missing' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });
});
