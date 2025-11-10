import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// FORÇAR LIMPEZA DE CACHE - delete variáveis antigas se existirem
const OLD_HOSTS = ['hopper.proxy.rlwy.net'];
if (OLD_HOSTS.includes(process.env.RAILWAY_DB_HOST || '')) {
  console.log('⚠️ DETECTADAS CREDENCIAIS ANTIGAS - REINICIE O SERVIDOR!');
  delete process.env.RAILWAY_DB_HOST;
  delete process.env.RAILWAY_DB_PORT;
  delete process.env.RAILWAY_DB_NAME;
  delete process.env.RAILWAY_DB_USER;
  delete process.env.RAILWAY_DB_PASSWORD;
}

// Configuração para banco PostgreSQL da Railway
const dbConfig = {
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
  console.error('⚠️ Credenciais do banco não configuradas');
  throw new Error('Credenciais do banco Railway não configuradas nas Secrets');
}

console.log('🚂 Conectado ao banco de dados Railway PostgreSQL');

export const pool = new Pool(dbConfig);



export const db = drizzle(pool, { schema });