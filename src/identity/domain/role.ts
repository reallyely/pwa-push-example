export const ROLES = Object.freeze({
  PARTICIPANT: 'Participant',
  RESEARCHER: 'Researcher',
  TRAINER: 'Trainer',
} as const);

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ALL: readonly Role[] = Object.freeze(Object.values(ROLES));

export function isValid(role: string): role is Role {
  return (ALL as readonly string[]).includes(role);
}
