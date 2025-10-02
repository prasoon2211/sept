import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .url()
      .default("postgresql://sept:sept@localhost:5433/sept"),
    REDIS_URL: z.string().url().default("redis://localhost:6380"),
    REDIS_HOST: z.string().default("localhost"),
    REDIS_PORT: z.coerce.number().default(6380),
    COMPUTE_SERVICE_URL: z.string().url().default("http://localhost:8547"),
    AUTH_SECRET: z.string().min(32).optional(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(4000),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
