import type { CorsOptions } from "cors";

export const corsConfig: CorsOptions = {
  origin(origin, callback) {
    const allowed = (process.env.FRONTEND_URL ?? "http://localhost:3000")
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  credentials: true,
};
