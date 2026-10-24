export const BACKEND_URL = (
  import.meta.env.BACKEND_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ''
).replace(/\/$/, '');

