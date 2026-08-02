export interface TrainingError extends Error {
  code?: string;
}

export function trainingError(message: string, code: string): TrainingError {
  const err: TrainingError = new Error(message);
  err.code = code;
  return err;
}
