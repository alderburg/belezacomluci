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

async function consolidateDuplicates() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Buscando duplicados de analytics_targets...\n');
    
    // Buscar todos os analytics_targets de cupons
    const allTargets = await client.query(`
      SELECT id, target_name, coupon_id
      FROM analytics_targets 
      WHERE target_type = 'coupon' 
      ORDER BY target_name
    `);
    
    // Agrupar por marca base (sem desconto)
    const brandGroups = new Map<string, any[]>();
    
    allTargets.rows.forEach(row => {
      const brandName = row.target_name.split(' - ')[0].trim();
      if (!brandGroups.has(brandName)) {
        brandGroups.set(brandName, []);
      }
      brandGroups.get(brandName)!.push(row);
    });
    
    let totalConsolidated = 0;
    let totalClicksMoved = 0;
    
    // Processar cada grupo de marca
    for (const [brand, records] of brandGroups) {
      if (records.length <= 1) continue; // Não há duplicados
      
      // Encontrar o registro "limpo" (sem desconto) e os antigos (com desconto)
      const cleanRecord = records.find(r => r.target_name === brand);
      const oldRecords = records.filter(r => r.target_name !== brand);
      
      if (!cleanRecord || oldRecords.length === 0) continue;
      
      console.log(`\n🔄 Consolidando: "${brand}"`);
      console.log(`   ✅ Registro principal: "${cleanRecord.target_name}" (ID: ${cleanRecord.id})`);
      
      for (const oldRecord of oldRecords) {
        console.log(`   ⚠️  Registro duplicado: "${oldRecord.target_name}" (ID: ${oldRecord.id})`);
        
        // Contar cliques no registro antigo
        const clickCount = await client.query(
          'SELECT COUNT(*) as count FROM bio_clicks WHERE analytics_target_id = $1',
          [oldRecord.id]
        );
        
        const clicks = parseInt(clickCount.rows[0].count);
        console.log(`      → ${clicks} cliques encontrados`);
        
        if (clicks > 0) {
          // Mover todos os cliques para o registro limpo
          const updateResult = await client.query(
            'UPDATE bio_clicks SET analytics_target_id = $1 WHERE analytics_target_id = $2',
            [cleanRecord.id, oldRecord.id]
          );
          
          console.log(`      → ${updateResult.rowCount} cliques movidos para o registro principal`);
          totalClicksMoved += clicks;
        }
        
        // Deletar o registro antigo
        await client.query(
          'DELETE FROM analytics_targets WHERE id = $1',
          [oldRecord.id]
        );
        
        console.log(`      → Registro duplicado deletado ✓`);
        totalConsolidated++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Consolidação concluída!`);
    console.log(`   📊 Total de registros consolidados: ${totalConsolidated}`);
    console.log(`   🔗 Total de cliques movidos: ${totalClicksMoved}`);
    
    // Verificar resultado final
    console.log('\n🔍 Verificando resultado...');
    const finalCheck = await client.query(`
      SELECT 
        target_name,
        COUNT(*) as total_registros,
        COUNT(DISTINCT coupon_id) as cupons_distintos
      FROM analytics_targets 
      WHERE target_type = 'coupon'
      GROUP BY target_name
      HAVING COUNT(*) > 1
    `);
    
    if (finalCheck.rows.length === 0) {
      console.log('   ✅ Nenhum duplicado encontrado! Tudo limpo.');
    } else {
      console.log('   ⚠️  Ainda existem duplicados:');
      finalCheck.rows.forEach(row => {
        console.log(`      - "${row.target_name}": ${row.total_registros} registros`);
      });
    }
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro durante consolidação:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

consolidateDuplicates();
