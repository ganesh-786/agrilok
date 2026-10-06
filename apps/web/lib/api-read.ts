// A read must finish its body within the same budget as its connection. Keeping
// this transport independent of Next.js also lets stalled upstreams be tested.
export const API_READ_TIMEOUT_MS = 5_000;

export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

export async function readApiJson<T>(
  url: string,
  init: RequestInit,
  timeoutMs = API_READ_TIMEOUT_MS,
): Promise<T | null> {
  const deadline = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  try {
    const response = await fetch(url, { ...init, signal });
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiUnavailableError(`the API answered ${response.status}`);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiUnavailableError) throw error;
    throw new ApiUnavailableError(
      deadline.aborted ? "the API read timed out" : "the API read could not be completed",
    );
  }
}
