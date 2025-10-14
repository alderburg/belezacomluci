import { defineConfig } from "drizzle-kit";

const DB_PROVIDER = process.env.DB_PROVIDER || 'railway';

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: DB_PROVIDER === 'railway' ? {
    host: process.env.RAILWAY_DB_HOST!,
    port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
    database: process.env.RAILWAY_DB_NAME!,
    user: process.env.RAILWAY_DB_USER!,
    password: process.env.RAILWAY_DB_PASSWORD!,
    ssl: {
      rejectUnauthorized: false,
    },
  } : {
    host: process.env.LOCAWEB_DB_HOST!,
    port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
    database: process.env.LOCAWEB_DB_NAME!,
    user: process.env.LOCAWEB_DB_USER!,
    password: process.env.LOCAWEB_DB_PASSWORD!,
    ssl: false,
  },
});
