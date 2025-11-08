import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
  console.error('Variáveis de ambiente Railway em falta:', missingVars);
  throw new Error(
    `Credenciais do banco Railway não configuradas. Variáveis em falta: ${missingVars.join(', ')}`,
  );
}

console.log('🚂 Usando banco de dados Railway PostgreSQL');

export const pool = new Pool(dbConfig);

// Configurar o fuso horário do Brasil (UTC-3) para todas as conexões
pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'America/Sao_Paulo'", (err) => {
    if (err) {
      console.error('Erro ao configurar fuso horário:', err);
    } else {
      console.log('✅ Fuso horário configurado para America/Sao_Paulo (UTC-3)');
    }
  });
});

export const db = drizzle(pool, { schema });