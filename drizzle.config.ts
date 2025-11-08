
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.RAILWAY_DB_HOST!.trim(),
    port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
    database: process.env.RAILWAY_DB_NAME!.trim(),
    user: process.env.RAILWAY_DB_USER!.trim(),
    password: process.env.RAILWAY_DB_PASSWORD!.trim(),
    ssl: {
      rejectUnauthorized: false,
    },
  },
});
