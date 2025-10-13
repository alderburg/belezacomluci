import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.LOCAWEB_DB_HOST!,
    port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
    database: process.env.LOCAWEB_DB_NAME!,
    user: process.env.LOCAWEB_DB_USER!,
    password: process.env.LOCAWEB_DB_PASSWORD!,
    ssl: false,
  },
});
