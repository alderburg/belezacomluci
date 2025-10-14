import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const railwayPool = new Pool({
  host: process.env.RAILWAY_DB_HOST,
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME,
  user: process.env.RAILWAY_DB_USER,
  password: process.env.RAILWAY_DB_PASSWORD,
  ssl: false,
});

const backupDir = path.join(process.cwd(), 'scripts/migration/backup');

const tablesInOrder = [
  'users',
  'subscriptions',
  'categories',
  'videos',
  'products',
  'coupons',
  'banners',
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

async function importTable(tableName: string) {
  try {
    const backupFile = path.join(backupDir, `${tableName}.json`);
    
    if (!fs.existsSync(backupFile)) {
      console.log(`⏭️  Pulando ${tableName} (sem arquivo de backup)`);
      return { table: tableName, count: 0, skipped: true };
    }
    
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    
    if (data.length === 0) {
      console.log(`⏭️  Pulando ${tableName} (vazio)`);
      return { table: tableName, count: 0, skipped: true };
    }
    
    console.log(`📥 Importando ${tableName} (${data.length} registros)...`);
    
    for (const row of data) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      await railwayPool.query(query, values);
    }
    
    console.log(`✅ Importado: ${tableName} (${data.length} registros)`);
    return { table: tableName, count: data.length };
  } catch (error: any) {
    console.error(`❌ Erro ao importar ${tableName}:`, error.message);
    return { table: tableName, count: 0, error: error.message };
  }
}

async function main() {
  console.log('🚀 Iniciando importação para Railway...\n');
  
  const results = [];
  
  for (const table of tablesInOrder) {
    const result = await importTable(table);
    results.push(result);
  }
  
  console.log('\n📊 Resumo da Importação:');
  console.log('═══════════════════════════════════════');
  
  let totalRecords = 0;
  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.table}: ERRO - ${r.error}`);
    } else if (r.skipped) {
      console.log(`⏭️  ${r.table}: PULADO`);
    } else {
      console.log(`✅ ${r.table}: ${r.count} registros`);
      totalRecords += r.count;
    }
  });
  
  console.log('═══════════════════════════════════════');
  console.log(`📈 Total de registros importados: ${totalRecords}`);
  
  await railwayPool.end();
  console.log('\n✨ Importação concluída com sucesso!');
}

main().catch(console.error);
