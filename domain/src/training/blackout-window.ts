export const DAYS_OF_WEEK = Object.freeze([
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const);

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export function isValidDayOfWeek(value: string): value is DayOfWeek {
  return (DAYS_OF_WEEK as readonly string[]).includes(value);
}

const TIME_SHAPE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface BlackoutWindowInput {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface BlackoutWindowProps {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export class BlackoutWindow {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;

  constructor({ dayOfWeek, startTime, endTime }: BlackoutWindowProps) {
    this.dayOfWeek = dayOfWeek;
    this.startTime = startTime;
    this.endTime = endTime;
  }

  // The only creation path. One BlackoutWindow is a single range on a single
  // day — a person's full set is a plain BlackoutWindow[], not modeled by
  // any wrapping entity here.
  static between({ dayOfWeek, startTime, endTime }: BlackoutWindowInput): BlackoutWindow {
    if (!isValidDayOfWeek(dayOfWeek)) {
      throw new Error('BlackoutWindow requires a valid dayOfWeek');
    }
    if (!TIME_SHAPE.test(startTime)) {
      throw new Error('BlackoutWindow requires startTime in HH:mm format');
    }
    if (!TIME_SHAPE.test(endTime)) {
      throw new Error('BlackoutWindow requires endTime in HH:mm format');
    }
    if (startTime === endTime) {
      throw new Error('BlackoutWindow requires startTime and endTime to differ');
    }
    return new BlackoutWindow({ dayOfWeek, startTime, endTime });
  }
}
