export interface IdentityError extends Error {
  code?: string;
}

export function identityError(message: string, code: string): IdentityError {
  const err: IdentityError = new Error(message);
  err.code = code;
  return err;
}
