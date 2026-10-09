import { getAuthToken } from './auth';

const API_BASE = '/api';

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorBody?.error || `Request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export type ScanType = 'image' | 'video' | 'certificate' | 'url' | 'message' | 'social' | 'comparison';

export async function recordInvestigation(input: {
  title: string;
  scanType: ScanType;
  resultStatus: string;
  notes?: string;
}) {
  return apiFetch<{ id: string }>('/investigations', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function formatDate(dateValue?: string | null) {
  if (!dateValue) return '—';
  return new Date(dateValue).toLocaleString();
}
