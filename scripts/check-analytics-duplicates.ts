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

async function checkDuplicates() {
  try {
    console.log('🔍 Verificando analytics_targets...\n');
    
    // Ver todos os target_name de cupons
    const allTargets = await pool.query(`
      SELECT target_type, target_name, coupon_id, id
      FROM analytics_targets 
      WHERE target_type = 'coupon' 
      ORDER BY target_name
    `);
    
    console.log('=== Todos os Analytics Targets (Coupons) ===');
    console.log(`Total de registros: ${allTargets.rows.length}\n`);
    
    // Agrupar por target_name para ver duplicados
    const grouped = await pool.query(`
      SELECT 
        target_name,
        COUNT(*) as total_registros,
        COUNT(DISTINCT coupon_id) as cupons_distintos,
        array_agg(DISTINCT coupon_id) as coupon_ids
      FROM analytics_targets 
      WHERE target_type = 'coupon'
      GROUP BY target_name
      ORDER BY target_name
    `);
    
    console.log('=== Agrupamento por target_name ===');
    grouped.rows.forEach(row => {
      if (row.total_registros > 1 || row.cupons_distintos > 1) {
        console.log(`\n⚠️  target_name: "${row.target_name}"`);
        console.log(`   Total de registros: ${row.total_registros}`);
        console.log(`   Cupons distintos: ${row.cupons_distintos}`);
        console.log(`   IDs dos cupons: ${row.coupon_ids}`);
      }
    });
    
    // Buscar nomes que parecem duplicados (com e sem desconto)
    console.log('\n=== Possíveis duplicados (marca com/sem desconto) ===');
    const brands = new Map<string, any[]>();
    
    allTargets.rows.forEach(row => {
      const brandName = row.target_name.split(' - ')[0].trim();
      if (!brands.has(brandName)) {
        brands.set(brandName, []);
      }
      brands.get(brandName)!.push(row);
    });
    
    brands.forEach((records, brand) => {
      if (records.length > 1) {
        console.log(`\n🔴 Marca: "${brand}"`);
        records.forEach(r => {
          console.log(`   - target_name: "${r.target_name}" (ID: ${r.id}, Coupon: ${r.coupon_id})`);
        });
      }
    });
    
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    await pool.end();
  }
}

checkDuplicates();
