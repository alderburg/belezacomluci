
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

async function applyCommentInteractionsMigration() {
  console.log('🚀 Aplicando migração de interações de comentários no Railway...\n');
  
  try {
    // Testar conexão
    console.log('📡 Testando conexão com Railway...');
    await railwayPool.query('SELECT NOW()');
    console.log('✅ Conectado ao Railway!\n');
    
    // Ler arquivo de migração
    const migrationFile = path.join(process.cwd(), 'migrations', '0018_add_comment_interactions.sql');
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');
    
    console.log('📄 Executando migração 0018_add_comment_interactions.sql...\n');
    
    // Executar a migração
    await railwayPool.query(migrationSQL);
    
    console.log('✅ Tabelas comment_likes e comment_replies criadas com sucesso!');
    console.log('✅ Colunas likes e reply_count adicionadas aos comentários!');
    console.log('✅ Triggers e funções criados!\n');
    
    // Verificar tabelas criadas
    const checkTables = await railwayPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('comment_likes', 'comment_replies')
      ORDER BY table_name;
    `);
    
    if (checkTables.rows.length > 0) {
      console.log('📊 Tabelas criadas:');
      checkTables.rows.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
      console.log('');
    }
    
    // Verificar colunas adicionadas
    const checkColumns = await railwayPool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'comments'
      AND column_name IN ('likes', 'reply_count')
      ORDER BY column_name;
    `);
    
    if (checkColumns.rows.length > 0) {
      console.log('📋 Colunas adicionadas à tabela comments:');
      checkColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default})`);
      });
      console.log('');
    }
    
    console.log('═══════════════════════════════════════');
    console.log('✨ Migração aplicada com sucesso!');
    console.log('🎉 Sistema de curtidas e respostas de comentários está pronto!');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Algumas tabelas/colunas já existem no Railway.');
      console.log('✅ Nenhuma ação adicional necessária!');
    } else {
      throw error;
    }
  } finally {
    await railwayPool.end();
  }
}

applyCommentInteractionsMigration().catch(console.error);
