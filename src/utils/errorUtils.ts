export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

export const createError = (context: string, error: unknown): Error => {
  return new Error(`${context}: ${getErrorMessage(error)}`);
};
