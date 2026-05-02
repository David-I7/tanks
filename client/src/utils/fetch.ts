import { wait } from "./time";

async function safeJson(res: Response) {
  const contentType = res.headers.get("content-type") || "";

  if (contentType.startsWith("application/json")) {
    return await res.json();
  } else return null;
}

export async function fetchWithRetry(fetchFn: () => Promise<Response>) {
  let retries = 3;
  let retryDelay = 500;
  let lastError: Error;

  while (retries > 0) {
    try {
      const res = await fetchFn();

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          return await res.json();
        }

        return res;
      }

      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        const errorBody = await safeJson(res);
        throw new Error(
          `Request failed (${res.status}): ${JSON.stringify(errorBody)}`,
        );
      }

      lastError = new Error(`Retryable error: ${res.status}`);
    } catch (err) {
      lastError = err as Error;
    }

    retries--;

    if (retries === 0) break;

    await wait(retryDelay);
    retryDelay *= 2;
  }

  throw lastError!;
}
