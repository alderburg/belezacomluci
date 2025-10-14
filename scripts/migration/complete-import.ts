
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

const backupDir = path.join(process.cwd(), 'scripts/migration/backup');

// Ordem correta respeitando foreign keys
const tablesInOrder = [
  'users',
  'categories',
  'videos',
  'products',
  'coupons',
  'banners',
  'subscriptions',
  'posts',
  'post_likes',
  'post_tags',
  'comments',
  'user_activity',
  'video_likes',
  'popups',
  'popup_views',
  'notifications',
  'user_notifications',
  'notification_settings',
  'share_settings',
  'referrals',
  'user_points',
  'missions',
  'user_missions',
  'rewards',
  'user_rewards',
  'raffles',
  'raffle_entries',
  'raffle_winners',
  'achievements',
  'user_achievements'
];

async function checkExistingData() {
  console.log('🔍 Verificando dados existentes no Railway...\n');
  
  const summary: any = {};
  
  for (const table of tablesInOrder) {
    const result = await railwayPool.query(`SELECT COUNT(*) FROM "${table}"`);
    const count = parseInt(result.rows[0].count);
    summary[table] = count;
    
    if (count > 0) {
      console.log(`  ✓ ${table}: ${count} registros`);
    } else {
      console.log(`  ✗ ${table}: vazio`);
    }
  }
  
  return summary;
}

async function importTable(tableName: string, forceReimport = false) {
  try {
    const backupFile = path.join(backupDir, `${tableName}.json`);
    
    if (!fs.existsSync(backupFile)) {
      console.log(`⏭️  ${tableName}: sem arquivo de backup`);
      return { table: tableName, count: 0, skipped: true };
    }
    
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    
    if (data.length === 0) {
      console.log(`⏭️  ${tableName}: backup vazio`);
      return { table: tableName, count: 0, skipped: true };
    }
    
    // Verificar se já tem dados
    const existingCount = await railwayPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const existing = parseInt(existingCount.rows[0].count);
    
    if (existing >= data.length && !forceReimport) {
      console.log(`✓ ${tableName}: já importado (${existing} registros)`);
      return { table: tableName, count: existing, skipped: true };
    }
    
    console.log(`📥 Importando ${tableName} (${data.length} registros)...`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const row of data) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      try {
        const result = await railwayPool.query(query, values);
        if (result.rowCount && result.rowCount > 0) {
          imported++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        console.error(`  ⚠️  Erro ao importar registro: ${err.message}`);
        skipped++;
      }
    }
    
    console.log(`✅ ${tableName}: ${imported} importados, ${skipped} pulados`);
    return { table: tableName, count: imported, skipped };
  } catch (error: any) {
    console.error(`❌ Erro ao importar ${tableName}:`, error.message);
    return { table: tableName, count: 0, error: error.message };
  }
}

async function main() {
  console.log('🚀 Importação Completa: Backup → Railway\n');
  console.log('═══════════════════════════════════════\n');
  
  // Verificar dados existentes
  const existingSummary = await checkExistingData();
  console.log('');
  
  // Carregar resumo do backup
  const backupSummary = JSON.parse(
    fs.readFileSync(path.join(backupDir, '_backup-summary.json'), 'utf-8')
  );
  
  console.log('📦 Resumo do Backup:');
  console.log(`  Data: ${new Date(backupSummary.date).toLocaleString('pt-BR')}`);
  console.log(`  Total: ${backupSummary.totalRecords} registros\n`);
  
  // Importar todas as tabelas
  console.log('📥 Iniciando importação...\n');
  
  const results = [];
  let totalImported = 0;
  
  for (const table of tablesInOrder) {
    const result = await importTable(table);
    results.push(result);
    if (!result.skipped && !result.error) {
      totalImported += result.count;
    }
  }
  
  // Resumo final
  console.log('\n📊 Resumo da Importação:');
  console.log('═══════════════════════════════════════');
  
  results.forEach(r => {
    const backupCount = backupSummary.tables.find((t: any) => t.table === r.table)?.count || 0;
    const currentCount = existingSummary[r.table] || 0;
    
    if (r.error) {
      console.log(`❌ ${r.table}: ERRO - ${r.error}`);
    } else if (r.skipped) {
      console.log(`⏭️  ${r.table}: ${currentCount}/${backupCount} (já importado)`);
    } else {
      console.log(`✅ ${r.table}: ${r.count} novos (total: ${currentCount + r.count}/${backupCount})`);
    }
  });
  
  console.log('═══════════════════════════════════════');
  console.log(`📈 Total de novos registros: ${totalImported}`);
  console.log(`📊 Total de registros esperados: ${backupSummary.totalRecords}`);
  
  // Verificação final
  console.log('\n🔍 Verificação Final:');
  const finalSummary = await checkExistingData();
  
  const finalTotal = Object.values(finalSummary).reduce((a: any, b: any) => a + b, 0);
  console.log(`\n✨ Total no Railway: ${finalTotal} registros`);
  
  if (finalTotal >= backupSummary.totalRecords) {
    console.log('🎉 Importação completa com sucesso!');
  } else {
    console.log(`⚠️  Faltam ${backupSummary.totalRecords - finalTotal} registros`);
  }
  
  await railwayPool.end();
}

main().catch(console.error);
