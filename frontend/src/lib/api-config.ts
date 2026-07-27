/**
 * API Configuration — works everywhere
 *
 * Set VITE_API_URL env var ONLY if backend is on a different domain:
 *   Vercel frontend → Railway backend: VITE_API_URL=https://your-railway.up.railway.app
 *
 * If VITE_API_URL is not set, uses relative URLs (same domain = same server)
 */

export function api(path: string): string {
  const base = (import.meta as any).env?.VITE_API_URL
  if (base) return base.replace(/\/$/, '') + path
  return path
}

export const apiFetch = async (path: string, options?: RequestInit): Promise<Response> => {
  return fetch(api(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
}
