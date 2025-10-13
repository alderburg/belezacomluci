import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuração para banco PostgreSQL da Locaweb
const dbConfig = {
  host: process.env.LOCAWEB_DB_HOST,
  port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
  database: process.env.LOCAWEB_DB_NAME,
  user: process.env.LOCAWEB_DB_USER,
  password: process.env.LOCAWEB_DB_PASSWORD,
  ssl: false, // Ajuste conforme necessário para a Locaweb
};

// Verificar se todas as variáveis necessárias estão definidas
const missingVars = [];
if (!dbConfig.host) missingVars.push('LOCAWEB_DB_HOST');
if (!dbConfig.database) missingVars.push('LOCAWEB_DB_NAME');
if (!dbConfig.user) missingVars.push('LOCAWEB_DB_USER');
if (!dbConfig.password) missingVars.push('LOCAWEB_DB_PASSWORD');

if (missingVars.length > 0) {
  console.error('Variáveis de ambiente em falta:', missingVars);
  console.error('Verifique se o arquivo .env está presente e contém as credenciais corretas');
  throw new Error(
    `Credenciais do banco Locaweb não configuradas. Variáveis em falta: ${missingVars.join(', ')}`,
  );
}

export const pool = new Pool(dbConfig);
export const db = drizzle(pool, { schema });