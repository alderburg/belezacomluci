import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const locawebPool = new Pool({
  host: process.env.LOCAWEB_DB_HOST,
  port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
  database: process.env.LOCAWEB_DB_NAME,
  user: process.env.LOCAWEB_DB_USER,
  password: process.env.LOCAWEB_DB_PASSWORD,
  ssl: false,
});

const backupDir = path.join(process.cwd(), 'scripts/migration/backup');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const tables = [
  'users', 'subscriptions', 'videos', 'categories', 'products', 'coupons',
  'banners', 'posts', 'post_likes', 'post_tags', 'comments', 'user_activity',
  'video_likes', 'popups', 'popup_views', 'notifications', 'user_notifications',
  'notification_settings', 'share_settings', 'referrals', 'user_points',
  'missions', 'user_missions', 'rewards', 'user_rewards', 'raffles',
  'raffle_entries', 'raffle_winners', 'achievements', 'user_achievements'
];

async function backupTable(tableName: string) {
  try {
    console.log(`📦 Fazendo backup da tabela: ${tableName}`);
    
    const result = await locawebPool.query(`SELECT * FROM ${tableName}`);
    const data = result.rows;
    
    const backupFile = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
    
    console.log(`✅ Backup completo: ${tableName} (${data.length} registros)`);
    return { table: tableName, count: data.length };
  } catch (error: any) {
    console.error(`❌ Erro no backup de ${tableName}:`, error.message);
    return { table: tableName, count: 0, error: error.message };
  }
}

async function main() {
  console.log('🚀 Iniciando backup do banco Locaweb...\n');
  
  const results = [];
  
  for (const table of tables) {
    const result = await backupTable(table);
    results.push(result);
  }
  
  console.log('\n📊 Resumo do Backup:');
  console.log('═══════════════════════════════════════');
  
  let totalRecords = 0;
  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.table}: ERRO - ${r.error}`);
    } else {
      console.log(`✅ ${r.table}: ${r.count} registros`);
      totalRecords += r.count;
    }
  });
  
  console.log('═══════════════════════════════════════');
  console.log(`📈 Total de registros salvos: ${totalRecords}`);
  console.log(`📁 Arquivos salvos em: ${backupDir}`);
  
  const summaryFile = path.join(backupDir, '_backup-summary.json');
  fs.writeFileSync(summaryFile, JSON.stringify({
    date: new Date().toISOString(),
    totalRecords,
    tables: results
  }, null, 2));
  
  await locawebPool.end();
  console.log('\n✨ Backup concluído com sucesso!');
}

main().catch(console.error);
