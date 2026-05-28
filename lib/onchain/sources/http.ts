export async function fetchJson<T>(url: string, options: RequestInit & { timeoutMs?: number; retries?: number } = {}): Promise<T> {
  const { timeoutMs = 12000, retries = 1, ...init } = options;
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal, headers: { accept: 'application/json', ...(init.headers || {}) }, next: { revalidate: 900 } as any });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.json() as T;
    } catch (error) {
      last = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw last instanceof Error ? last : new Error('Fetch failed');
}

export async function fetchText(url: string, options: RequestInit & { timeoutMs?: number; retries?: number } = {}): Promise<string> {
  const { timeoutMs = 12000, retries = 1, ...init } = options;
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal, headers: { accept: 'text/html,*/*', ...(init.headers || {}) }, next: { revalidate: 900 } as any });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (error) {
      last = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw last instanceof Error ? last : new Error('Fetch failed');
}
