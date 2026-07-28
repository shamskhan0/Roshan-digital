/**
 * API Configuration — Vercel Serverless Functions
 * Backend is now served from /api/* on the same domain
 */

export function api(path: string): string {
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
