import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { SurveyResponse, SURVEY_RESPONSE_STATUSES } from './survey-response.ts';

function validOpen(overrides = {}) {
  return {
    id: 'sr1',
    surveyId: 's1',
    userId: 'u1',
    now: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('SurveyResponse.open', () => {
  test('requires an id', () => {
    assert.throws(() => SurveyResponse.open(validOpen({ id: '' })));
  });

  test('requires a surveyId', () => {
    assert.throws(() => SurveyResponse.open(validOpen({ surveyId: '' })));
  });

  test('requires a userId', () => {
    assert.throws(() => SurveyResponse.open(validOpen({ userId: '' })));
  });

  test('requires a valid now', () => {
    assert.throws(() => SurveyResponse.open(validOpen({ now: new Date('not-a-date') })));
  });

  test('opens with status Opened and empty answers/resourceAccesses', () => {
    const response = SurveyResponse.open(validOpen());
    assert.equal(response.status, SURVEY_RESPONSE_STATUSES.OPENED);
    assert.equal(response.openedTime.toISOString(), '2026-09-01T10:00:00.000Z');
    assert.deepEqual(response.answers, []);
    assert.deepEqual(response.resourceAccesses, []);
    assert.equal(response.finishedTime, null);
  });
});

describe('SurveyResponse#accessResource', () => {
  test('requires a resourceId', () => {
    const response = SurveyResponse.open(validOpen());
    assert.throws(() => response.accessResource('', new Date()));
  });

  test('appends a ResourceAccess', () => {
    const response = SurveyResponse.open(validOpen());
    const accessedTime = new Date('2026-09-01T11:00:00.000Z');
    response.accessResource('r1', accessedTime);
    assert.deepEqual(response.resourceAccesses, [{ resourceId: 'r1', accessedTime }]);
  });

  test('is allowed after the response has already finished', () => {
    const response = SurveyResponse.open(validOpen());
    response.finish([], new Date('2026-09-01T12:00:00.000Z'));
    response.accessResource('r1', new Date('2026-09-01T13:00:00.000Z'));
    assert.equal(response.resourceAccesses.length, 1);
  });
});

describe('SurveyResponse#finish', () => {
  test('sets answers, finishedTime, and status Finished', () => {
    const response = SurveyResponse.open(validOpen());
    const finishedTime = new Date('2026-09-01T12:00:00.000Z');
    const answers = [{ questionId: 'q1', value: 'yes' }];
    response.finish(answers, finishedTime);
    assert.equal(response.status, SURVEY_RESPONSE_STATUSES.FINISHED);
    assert.equal(response.finishedTime, finishedTime);
    assert.deepEqual(response.answers, answers);
  });

  test('cannot finish a response that is already Finished', () => {
    const response = SurveyResponse.open(validOpen());
    response.finish([], new Date('2026-09-01T12:00:00.000Z'));
    assert.throws(
      () => response.finish([], new Date('2026-09-01T13:00:00.000Z')),
      (err: any) => err.code === 'ALREADY_FINISHED',
    );
  });
});
