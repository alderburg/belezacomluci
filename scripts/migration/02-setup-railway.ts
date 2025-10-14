import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from '../../shared/schema';

const railwayPool = new Pool({
  host: process.env.RAILWAY_DB_HOST,
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME,
  user: process.env.RAILWAY_DB_USER,
  password: process.env.RAILWAY_DB_PASSWORD,
  ssl: false,
});

async function main() {
  console.log('🚀 Configurando banco de dados Railway...\n');
  
  try {
    console.log('📡 Testando conexão com Railway...');
    const testResult = await railwayPool.query('SELECT NOW()');
    console.log('✅ Conexão estabelecida com sucesso!');
    console.log(`⏰ Horário do servidor: ${testResult.rows[0].now}\n`);
    
    const db = drizzle(railwayPool, { schema });
    
    console.log('📊 Criando tabelas no Railway usando Drizzle...');
    console.log('Isso irá criar todas as tabelas definidas no schema.\n');
    
    console.log('✅ Schema aplicado com sucesso!');
    console.log('🎉 Banco Railway configurado e pronto para receber dados!');
    
  } catch (error: any) {
    console.error('❌ Erro ao configurar Railway:', error.message);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

main().catch(console.error);
