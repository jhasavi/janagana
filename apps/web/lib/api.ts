const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

type Params = Record<string, string | number | boolean | null | undefined>;

export type ApiCallOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  params?: Params;
  /** JSON body for POST/PATCH */
  body?: unknown;
};

export async function apiCall<T = unknown>(
  path: string,
  tenantSlug: string,
  token: string | null | undefined,
  options: ApiCallOptions = {},
): Promise<T> {
  const { method, params, body } = options;
  const resolvedMethod = method ?? (body ? 'POST' : 'GET');

  const url = new URL(`${BASE_URL}/api/v1${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: resolvedMethod,
    headers: {
      'x-tenant-slug': tenantSlug,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? `${resolvedMethod} ${path} → ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiUpload<T = unknown>(
  path: string,
  tenantSlug: string,
  token: string | null | undefined,
  formData: FormData,
  params?: Params,
): Promise<T> {
  const url = new URL(`${BASE_URL}/api/v1${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'x-tenant-slug': tenantSlug,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // No Content-Type — let browser set multipart boundary
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? `Upload failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}
