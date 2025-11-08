
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.railway' });

const pool = new Pool({
  host: process.env.RAILWAY_DB_HOST?.trim(),
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME?.trim(),
  user: process.env.RAILWAY_DB_USER?.trim(),
  password: process.env.RAILWAY_DB_PASSWORD?.trim(),
  ssl: {
    rejectUnauthorized: false,
  },
});

async function applyMigration() {
  console.log('🚀 Aplicando migração modal_image_url na tabela coupons...\n');
  
  try {
    console.log('📡 Conectando ao Railway PostgreSQL...');
    await pool.query('SELECT NOW()');
    console.log('✅ Conectado com sucesso!\n');
    
    // Ler o arquivo SQL
    const migrationPath = path.join(__dirname, '../migrations/0021_add_modal_image_url.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Executando migração...');
    console.log(migrationSQL);
    console.log('');
    
    // Executar a migração
    await pool.query(migrationSQL);
    
    console.log('✅ Migração aplicada com sucesso!\n');
    
    // Verificar os dados
    const result = await pool.query(`
      SELECT id, code, cover_image_url, modal_image_url 
      FROM coupons 
      LIMIT 5
    `);
    
    console.log('📊 Amostra dos dados migrados:');
    console.table(result.rows);
    
    const countResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(modal_image_url) as com_modal_image
      FROM coupons
    `);
    
    console.log('\n📈 Resumo:');
    console.log(`Total de cupons: ${countResult.rows[0].total}`);
    console.log(`Cupons com modal_image_url: ${countResult.rows[0].com_modal_image}`);
    console.log('\n✨ Migração concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

applyMigration().catch(console.error);
