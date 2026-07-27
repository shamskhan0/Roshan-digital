// Centralized API base URL handling.
//
// In local development VITE_API_URL is empty, so requests stay relative
// (e.g. "/api/auth/login") and Vite's dev proxy forwards them to the local
// Flask backend on port 5000.
//
// In production (Vercel) there is no proxy, so set VITE_API_URL to the fully
// qualified backend origin (e.g. your Railway URL:
// "https://your-backend.up.railway.app"). All "/api/..." requests are then
// rewritten to hit that backend directly.

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

// Install a global fetch wrapper once so every existing `fetch('/api/...')`
// call across the app automatically targets the configured backend.
if (API_BASE && typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window)

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/api')) {
      return originalFetch(API_BASE + input, init)
    }
    if (input instanceof Request && input.url.startsWith('/api')) {
      return originalFetch(new Request(API_BASE + input.url, input), init)
    }
    return originalFetch(input as any, init)
  }) as typeof window.fetch
}

export { API_BASE }
