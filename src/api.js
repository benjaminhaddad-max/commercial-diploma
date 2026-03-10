import { getToken } from './auth.js';

const API_BASE = '/api';

/** Fetch helper with auth */
async function apiFetch(endpoint, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}/${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

/** GET request */
export function apiGet(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${endpoint}?${qs}` : endpoint;
  return apiFetch(url);
}

/** POST request */
export function apiPost(endpoint, body = {}) {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** PUT request */
export function apiPut(endpoint, body = {}) {
  return apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}
