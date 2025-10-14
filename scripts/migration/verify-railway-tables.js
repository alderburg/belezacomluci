
import pg from 'pg';
const { Pool } = pg;

const railwayPool = new Pool({
  host: process.env.RAILWAY_DB_HOST,
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME,
  user: process.env.RAILWAY_DB_USER,
  password: process.env.RAILWAY_DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function verifyTables() {
  console.log('🔍 Verificando tabelas no Railway PostgreSQL...\n');
  
  try {
    console.log('📡 Conectando ao Railway...');
    await railwayPool.query('SELECT NOW()');
    console.log('✅ Conectado!\n');
    
    // Listar todas as tabelas
    const result = await railwayPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📊 Tabelas encontradas no banco:');
    console.log('═══════════════════════════════════════\n');
    
    if (result.rows.length === 0) {
      console.log('❌ NENHUMA TABELA ENCONTRADA!\n');
      console.log('Isso pode significar que:');
      console.log('1. As tabelas foram criadas em um schema diferente');
      console.log('2. Você está conectado ao banco errado');
      console.log('3. As transações não foram commitadas\n');
      
      // Verificar schemas disponíveis
      const schemas = await railwayPool.query(`
        SELECT schema_name 
        FROM information_schema.schemata
        ORDER BY schema_name;
      `);
      
      console.log('📁 Schemas disponíveis:');
      schemas.rows.forEach(row => {
        console.log(`  - ${row.schema_name}`);
      });
    } else {
      console.log(`Total de tabelas: ${result.rows.length}\n`);
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ${row.table_name}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════');
    
    // Verificar informações da conexão
    const connInfo = await railwayPool.query(`
      SELECT current_database(), current_user, version();
    `);
    
    console.log('\n📋 Informações da conexão:');
    console.log(`  Database: ${connInfo.rows[0].current_database}`);
    console.log(`  User: ${connInfo.rows[0].current_user}`);
    console.log(`  Version: ${connInfo.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

verifyTables().catch(console.error);
