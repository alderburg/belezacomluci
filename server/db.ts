import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Escolher qual banco usar: 'replit', 'railway' ou 'locaweb'
const DB_PROVIDER = process.env.DB_PROVIDER || 'replit';

let dbConfig;

if (DB_PROVIDER === 'replit') {
  // Configuração para banco PostgreSQL do Replit
  dbConfig = {
    host: process.env.PGHOST?.trim(),
    port: parseInt(process.env.PGPORT || '5432'),
    database: process.env.PGDATABASE?.trim(),
    user: process.env.PGUSER?.trim(),
    password: process.env.PGPASSWORD?.trim(),
    ssl: false,
  };

  // Verificar se todas as variáveis necessárias estão definidas
  const missingVars = [];
  if (!dbConfig.host) missingVars.push('PGHOST');
  if (!dbConfig.database) missingVars.push('PGDATABASE');
  if (!dbConfig.user) missingVars.push('PGUSER');
  if (!dbConfig.password) missingVars.push('PGPASSWORD');

  if (missingVars.length > 0) {
    console.error('Variáveis de ambiente Replit em falta:', missingVars);
    throw new Error(
      `Credenciais do banco Replit não configuradas. Variáveis em falta: ${missingVars.join(', ')}`,
    );
  }

  console.log('🔵 Usando banco de dados Replit PostgreSQL');
} else if (DB_PROVIDER === 'railway') {
  // Configuração para banco PostgreSQL da Railway
  dbConfig = {
    host: process.env.RAILWAY_DB_HOST?.trim(),
    port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
    database: process.env.RAILWAY_DB_NAME?.trim(),
    user: process.env.RAILWAY_DB_USER?.trim(),
    password: process.env.RAILWAY_DB_PASSWORD?.trim(),
    ssl: {
      rejectUnauthorized: false,
    },
  };

  // Verificar se todas as variáveis necessárias estão definidas
  const missingVars = [];
  if (!dbConfig.host) missingVars.push('RAILWAY_DB_HOST');
  if (!dbConfig.database) missingVars.push('RAILWAY_DB_NAME');
  if (!dbConfig.user) missingVars.push('RAILWAY_DB_USER');
  if (!dbConfig.password) missingVars.push('RAILWAY_DB_PASSWORD');

  if (missingVars.length > 0) {
    console.error('Variáveis de ambiente Railway em falta:', missingVars);
    throw new Error(
      `Credenciais do banco Railway não configuradas. Variáveis em falta: ${missingVars.join(', ')}`,
    );
  }

  console.log('🚂 Usando banco de dados Railway');
} else {
  // Configuração para banco PostgreSQL da Locaweb
  dbConfig = {
    host: process.env.LOCAWEB_DB_HOST,
    port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
    database: process.env.LOCAWEB_DB_NAME,
    user: process.env.LOCAWEB_DB_USER,
    password: process.env.LOCAWEB_DB_PASSWORD,
    ssl: false,
  };

  // Verificar se todas as variáveis necessárias estão definidas
  const missingVars = [];
  if (!dbConfig.host) missingVars.push('LOCAWEB_DB_HOST');
  if (!dbConfig.database) missingVars.push('LOCAWEB_DB_NAME');
  if (!dbConfig.user) missingVars.push('LOCAWEB_DB_USER');
  if (!dbConfig.password) missingVars.push('LOCAWEB_DB_PASSWORD');

  if (missingVars.length > 0) {
    console.error('Variáveis de ambiente Locaweb em falta:', missingVars);
    throw new Error(
      `Credenciais do banco Locaweb não configuradas. Variáveis em falta: ${missingVars.join(', ')}`,
    );
  }

  console.log('🌐 Usando banco de dados Locaweb');
}

export const pool = new Pool(dbConfig);
export const db = drizzle(pool, { schema });