// Production builds use same-origin (nginx proxies API routes to the backend).
// Dev keeps an explicit API host unless VITE_API_URL overrides it.
export const API_BASE_URL = import.meta.env.PROD
    ? (import.meta.env.VITE_API_URL || "")
    : (import.meta.env.VITE_API_URL || "http://127.0.0.1:3000");
