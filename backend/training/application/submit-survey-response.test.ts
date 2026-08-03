import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SubmitSurveyResponse } from './submit-survey-response.js';
import { SurveyResponse } from 'domain/training';
import type { SurveyResponseRepository } from './ports.js';

function fakeRepository(surveyResponse: SurveyResponse | null): SurveyResponseRepository & { saved: SurveyResponse[] } {
  const saved: SurveyResponse[] = [];
  const repository = {
    async findById() { return surveyResponse; },
    async findBySurveyAndUser() { throw new Error('not used in this test'); },
    async findBySurveyId() { throw new Error('not used in this test'); },
    async save(response: SurveyResponse) { saved.push(response); },
  };
  return Object.assign(repository, { saved }) as unknown as SurveyResponseRepository & { saved: SurveyResponse[] };
}

describe('SubmitSurveyResponse', () => {
  test('finishes the response with the given answers and saves', async () => {
    const surveyResponse = SurveyResponse.open({ id: 'sr1', surveyId: 's1', userId: 'u1', now: new Date() });
    const repository = fakeRepository(surveyResponse);
    const submitSurveyResponse = new SubmitSurveyResponse(repository);
    const answers = [{ questionId: 'q1', value: 'yes' }];

    await submitSurveyResponse.execute({ surveyResponseId: 'sr1', answers });

    assert.equal(surveyResponse.status, 'Finished');
    assert.deepEqual(surveyResponse.answers, answers);
    assert.equal(repository.saved.length, 1);
  });

  test('throws NOT_FOUND when no survey response has that id', async () => {
    const submitSurveyResponse = new SubmitSurveyResponse(fakeRepository(null));

    await assert.rejects(
      () => submitSurveyResponse.execute({ surveyResponseId: 'missing', answers: [] }),
      (err: any) => err.code === 'NOT_FOUND',
    );
  });

  test('propagates ALREADY_FINISHED when the response is already Finished', async () => {
    const surveyResponse = SurveyResponse.open({ id: 'sr1', surveyId: 's1', userId: 'u1', now: new Date() });
    surveyResponse.finish([], new Date());
    const submitSurveyResponse = new SubmitSurveyResponse(fakeRepository(surveyResponse));

    await assert.rejects(
      () => submitSurveyResponse.execute({ surveyResponseId: 'sr1', answers: [] }),
      (err: any) => err.code === 'ALREADY_FINISHED',
    );
  });
});
