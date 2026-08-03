import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GetSurveyResponse } from './get-survey-response.js';
import { SurveyResponse } from 'domain/training';
import type { SurveyResponseRepository } from './ports.js';

function fakeRepository(surveyResponse: SurveyResponse | null): SurveyResponseRepository {
  return {
    async findById() { return surveyResponse; },
    async findBySurveyAndUser() { throw new Error('not used in this test'); },
    async findBySurveyId() { throw new Error('not used in this test'); },
    async save() { throw new Error('not used in this test'); },
  } as unknown as SurveyResponseRepository;
}

describe('GetSurveyResponse', () => {
  test('returns the survey response when found', async () => {
    const surveyResponse = SurveyResponse.open({ id: 'sr1', surveyId: 's1', userId: 'u1', now: new Date() });
    const getSurveyResponse = new GetSurveyResponse(fakeRepository(surveyResponse));

    const result = await getSurveyResponse.execute({ surveyResponseId: 'sr1' });

    assert.equal(result, surveyResponse);
  });

  test('throws NOT_FOUND when no survey response has that id', async () => {
    const getSurveyResponse = new GetSurveyResponse(fakeRepository(null));

    await assert.rejects(
      () => getSurveyResponse.execute({ surveyResponseId: 'missing' }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });
});
