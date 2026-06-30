const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_CODES = new Set(["ECONNABORTED", "ERR_NETWORK", "ETIMEDOUT", "ECONNRESET"]);

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number) {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
  return exp + Math.floor(Math.random() * 500);
}

function isRetryableAxiosError(error: unknown): boolean {
  const err = error as { code?: string; response?: { status?: number } };
  if (err?.code && RETRYABLE_CODES.has(err.code)) return true;
  const status = err?.response?.status;
  return status != null && RETRYABLE_STATUS.has(status);
}

/** Retry axios requests on network errors and 5xx (mobile / cold-start friendly). */
export async function withAxiosRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const { retries = 3, baseDelayMs = 1500, maxDelayMs = 12000 } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isRetryableAxiosError(error)) throw error;
      await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs));
    }
  }
  throw lastError;
}

/** Retry fetch for SSR / server components. */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: RetryOptions = {}
): Promise<Response> {
  const { retries = 2, baseDelayMs = 2000, maxDelayMs = 10000 } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init);
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt >= retries) return res;
      await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs));
    } catch (error) {
      lastError = error;
      if (attempt >= retries) throw error;
      await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs));
    }
  }
  throw lastError;
}
