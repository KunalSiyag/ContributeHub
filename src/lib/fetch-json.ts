/** Error thrown for non-2xx API responses; `message` is safe to show users. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public resetAt?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new ApiError('You appear to be offline. Check your connection and try again.', 0, 'network');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.message ?? 'Something went wrong. Try again.', response.status, body?.error, body?.resetAt);
  }
  return body as T;
}
