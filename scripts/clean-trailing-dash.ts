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

async function cleanTrailingDash() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Buscando registros com " - " no final...\n');
    
    // Buscar todos os analytics_targets que terminam com " - "
    const targetsWithTrailing = await client.query(`
      SELECT id, target_name, coupon_id
      FROM analytics_targets 
      WHERE target_type = 'coupon' 
      AND (target_name LIKE '% - ' OR target_name LIKE '% -')
      ORDER BY target_name
    `);
    
    console.log(`📊 Encontrados ${targetsWithTrailing.rows.length} registros com " - " no final\n`);
    
    if (targetsWithTrailing.rows.length === 0) {
      console.log('✅ Nenhum registro precisa ser limpo!');
      await client.query('COMMIT');
      return;
    }
    
    let totalCleaned = 0;
    
    for (const record of targetsWithTrailing.rows) {
      const oldName = record.target_name;
      const newName = oldName.replace(/\s*-\s*$/, '').trim(); // Remove " - " ou " -" do final
      
      console.log(`🧹 Limpando:`);
      console.log(`   De: "${oldName}"`);
      console.log(`   Para: "${newName}"`);
      
      // Atualizar o registro
      await client.query(
        'UPDATE analytics_targets SET target_name = $1 WHERE id = $2',
        [newName, record.id]
      );
      
      console.log(`   ✅ Limpo!\n`);
      totalCleaned++;
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Limpeza concluída!`);
    console.log(`   📊 Total de registros limpos: ${totalCleaned}`);
    
    // Verificar resultado final
    console.log('\n🔍 Verificando resultado...');
    const finalCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM analytics_targets 
      WHERE target_type = 'coupon' 
      AND (target_name LIKE '% - ' OR target_name LIKE '% -')
    `);
    
    const remaining = parseInt(finalCheck.rows[0].count);
    if (remaining === 0) {
      console.log('   ✅ Nenhum registro com " - " no final! Tudo limpo.');
    } else {
      console.log(`   ⚠️  Ainda existem ${remaining} registros com " - " no final`);
    }
    
    // Mostrar amostra dos nomes finais
    const sample = await client.query(`
      SELECT DISTINCT target_name
      FROM analytics_targets 
      WHERE target_type = 'coupon'
      ORDER BY target_name
      LIMIT 10
    `);
    
    console.log('\n📋 Amostra dos nomes limpos:');
    sample.rows.forEach(row => {
      console.log(`   - "${row.target_name}"`);
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro durante limpeza:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanTrailingDash();
