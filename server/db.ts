import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Log para debug - verificar se as variáveis estão sendo carregadas
console.log('🔍 Verificando variáveis de ambiente Railway:');
console.log('  RAILWAY_DB_HOST:', process.env.RAILWAY_DB_HOST ? 'definido' : 'AUSENTE');
console.log('  RAILWAY_DB_PORT:', process.env.RAILWAY_DB_PORT || '5432');
console.log('  RAILWAY_DB_NAME:', process.env.RAILWAY_DB_NAME ? 'definido' : 'AUSENTE');
console.log('  RAILWAY_DB_USER:', process.env.RAILWAY_DB_USER ? 'definido' : 'AUSENTE');
console.log('  RAILWAY_DB_PASSWORD:', process.env.RAILWAY_DB_PASSWORD ? 'definido' : 'AUSENTE');

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

console.log('📊 Configuração do banco:');
console.log('  Host:', dbConfig.host);
console.log('  Port:', dbConfig.port);
console.log('  Database:', dbConfig.database);
console.log('  User:', dbConfig.user);

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



export const db = drizzle(pool, { schema });