// Small client-side fetch wrapper with timeout and JSON helpers
export async function fetchWithTimeout(input: RequestInfo, init?: RequestInit, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(input, { ...(init || {}), signal: controller.signal } as RequestInit);
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchJsonWithTimeout<T = any>(input: RequestInfo, init?: RequestInit, timeout = 15000): Promise<{ response: Response; body: T | null }>{
  const response = await fetchWithTimeout(input, init, timeout);
  const body = await response.json().catch(() => null);
  return { response, body };
}
