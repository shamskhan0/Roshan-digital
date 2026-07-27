/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin used in production, e.g. https://your-backend.up.railway.app. Leave empty in dev to use the Vite proxy. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
