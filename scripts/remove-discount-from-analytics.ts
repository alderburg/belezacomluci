import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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

async function removeDiscountFromAnalytics() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Buscando registros com " - " no target_name...\n');
    
    // Buscar todos os analytics_targets de cupons que contêm " - "
    const targetsWithDiscount = await client.query(`
      SELECT id, target_name, coupon_id
      FROM analytics_targets 
      WHERE target_type = 'coupon' 
      AND target_name LIKE '% - %'
      ORDER BY target_name
    `);
    
    console.log(`📊 Encontrados ${targetsWithDiscount.rows.length} registros com desconto\n`);
    
    if (targetsWithDiscount.rows.length === 0) {
      console.log('✅ Nenhum registro precisa ser atualizado!');
      await client.query('COMMIT');
      return;
    }
    
    let totalUpdated = 0;
    
    for (const record of targetsWithDiscount.rows) {
      const oldName = record.target_name;
      const newName = oldName.split(' - ')[0].trim(); // Pega apenas a marca
      
      console.log(`🔄 Atualizando:`);
      console.log(`   De: "${oldName}"`);
      console.log(`   Para: "${newName}"`);
      
      // Atualizar o registro
      await client.query(
        'UPDATE analytics_targets SET target_name = $1 WHERE id = $2',
        [newName, record.id]
      );
      
      console.log(`   ✅ Atualizado!\n`);
      totalUpdated++;
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Atualização concluída!`);
    console.log(`   📊 Total de registros atualizados: ${totalUpdated}`);
    
    // Verificar resultado final
    console.log('\n🔍 Verificando resultado...');
    const finalCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM analytics_targets 
      WHERE target_type = 'coupon' 
      AND target_name LIKE '% - %'
    `);
    
    const remaining = parseInt(finalCheck.rows[0].count);
    if (remaining === 0) {
      console.log('   ✅ Nenhum registro com " - " encontrado! Tudo limpo.');
    } else {
      console.log(`   ⚠️  Ainda existem ${remaining} registros com " - "`);
    }
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro durante atualização:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

removeDiscountFromAnalytics();
