import { logger } from '../logger';

export interface RetryOptions {
  retries: number;
  minTimeoutMs: number;
  factor: number;
}

const defaultOptions: RetryOptions = {
  retries: 3,
  minTimeoutMs: 1000,
  factor: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  let delay = opts.minTimeoutMs;

  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      logger.warn(
        { attempt, error, nextRetryInMs: delay },
        'Operation failed, retrying...'
      );
      if (attempt === opts.retries) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= opts.factor;
    }
  }

  throw lastError;
}
