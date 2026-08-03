import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BlackoutWindow, DAYS_OF_WEEK, isValidDayOfWeek } from './blackout-window.ts';

function validBlackoutWindow(overrides = {}) {
  return {
    dayOfWeek: 'Monday',
    startTime: '06:00',
    endTime: '07:00',
    ...overrides,
  };
}

describe('BlackoutWindow.between', () => {
  test('requires a valid dayOfWeek', () => {
    assert.throws(() => BlackoutWindow.between(validBlackoutWindow({ dayOfWeek: 'Someday' })));
  });

  test('requires startTime in HH:mm format', () => {
    assert.throws(() => BlackoutWindow.between(validBlackoutWindow({ startTime: '6am' })));
  });

  test('requires endTime in HH:mm format', () => {
    assert.throws(() => BlackoutWindow.between(validBlackoutWindow({ endTime: '25:00' })));
  });

  test('requires startTime and endTime to differ', () => {
    assert.throws(() => BlackoutWindow.between(validBlackoutWindow({ endTime: '06:00' })));
  });

  test('creates a blackout window', () => {
    const window = BlackoutWindow.between(validBlackoutWindow());
    assert.equal(window.dayOfWeek, 'Monday');
    assert.equal(window.startTime, '06:00');
    assert.equal(window.endTime, '07:00');
  });

  test('allows multiple windows on the same day', () => {
    const morning = BlackoutWindow.between({ dayOfWeek: 'Monday', startTime: '06:00', endTime: '07:00' });
    const evening = BlackoutWindow.between({ dayOfWeek: 'Monday', startTime: '19:00', endTime: '20:00' });
    assert.equal(morning.dayOfWeek, evening.dayOfWeek);
    assert.notEqual(morning.startTime, evening.startTime);
  });
});

describe('DAYS_OF_WEEK / isValidDayOfWeek', () => {
  test('has all seven days, Sunday through Saturday', () => {
    assert.deepEqual(DAYS_OF_WEEK, [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ]);
  });

  test('rejects a value outside the closed set', () => {
    assert.equal(isValidDayOfWeek('Someday'), false);
  });

  test('accepts each day of the week', () => {
    for (const day of DAYS_OF_WEEK) {
      assert.equal(isValidDayOfWeek(day), true);
    }
  });
});
