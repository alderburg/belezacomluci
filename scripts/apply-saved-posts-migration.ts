
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const railwayPool = new Pool({
  host: process.env.RAILWAY_DB_HOST?.trim(),
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME?.trim(),
  user: process.env.RAILWAY_DB_USER?.trim(),
  password: process.env.RAILWAY_DB_PASSWORD?.trim(),
  ssl: {
    rejectUnauthorized: false,
  },
});

async function applySavedPostsMigration() {
  console.log('🚀 Aplicando migração saved_posts no Railway...\n');
  
  try {
    // Testar conexão
    console.log('📡 Testando conexão com Railway...');
    await railwayPool.query('SELECT NOW()');
    console.log('✅ Conectado ao Railway!\n');
    
    // Ler arquivo de migração
    const migrationFile = path.join(process.cwd(), 'migrations', '0017_add_saved_posts.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('📄 Executando migração 0017_add_saved_posts.sql...\n');
    
    // Executar a migração
    await railwayPool.query(migrationSQL);
    
    console.log('✅ Tabela saved_posts criada com sucesso!');
    console.log('✅ Índices criados com sucesso!\n');
    
    // Verificar se a tabela foi criada
    const checkTable = await railwayPool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'saved_posts'
      ORDER BY ordinal_position;
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('📊 Estrutura da tabela saved_posts:');
      checkTable.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
      console.log('');
    }
    
    // Verificar índices
    const checkIndexes = await railwayPool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'saved_posts'
      AND schemaname = 'public';
    `);
    
    if (checkIndexes.rows.length > 0) {
      console.log('📇 Índices criados:');
      checkIndexes.rows.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
      console.log('');
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✨ Migração aplicada com sucesso!');
    console.log('🎉 A tabela saved_posts está pronta para uso!');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    
    // Verificar se a tabela já existe
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  A tabela saved_posts já existe no Railway.');
      console.log('✅ Nenhuma ação necessária!');
    } else {
      throw error;
    }
  } finally {
    await railwayPool.end();
  }
}

applySavedPostsMigration().catch(console.error);
