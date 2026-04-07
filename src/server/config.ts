export const PORT = 3001;

export const PUBLIC_SERVER_ORIGIN = (
  process.env.PUBLIC_SERVER_ORIGIN || `http://localhost:${PORT}`
).replace(/\/+$/, "");
