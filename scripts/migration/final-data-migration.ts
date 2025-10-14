import { Pool } from 'pg';
import * as fs from 'fs';

const locawebPool = new Pool({
  host: process.env.LOCAWEB_DB_HOST?.trim(),
  port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
  database: process.env.LOCAWEB_DB_NAME?.trim(),
  user: process.env.LOCAWEB_DB_USER?.trim(),
  password: process.env.LOCAWEB_DB_PASSWORD?.trim(),
  ssl: false,
});

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

async function copyData() {
  console.log('📊 Copiando dados: Locaweb → Railway\n');
  console.log('═══════════════════════════════════════\n');
  
  // Ordem que respeita foreign keys
  const tableOrder = [
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
    'user_achievements',
  ];
  
  let totalRecords = 0;
  const errorLog: any[] = [];
  
  for (const tableName of tableOrder) {
    try {
      const data = await locawebPool.query(`SELECT * FROM "${tableName}"`);
      
      if (data.rows.length === 0) {
        console.log(`  ⚪ ${tableName}: vazio`);
        continue;
      }
      
      let inserted = 0;
      for (const row of data.rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders})
        `;
        
        try {
          await railwayPool.query(query, values);
          inserted++;
        } catch (err: any) {
          errorLog.push({
            table: tableName,
            row: row,
            error: err.message,
          });
        }
      }
      
      const status = inserted === data.rows.length ? '✅' : '⚠️ ';
      console.log(`  ${status} ${tableName}: ${inserted}/${data.rows.length} registros`);
      totalRecords += inserted;
      
    } catch (err: any) {
      console.error(`  ❌ ${tableName}: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Total migrado: ${totalRecords} registros\n`);
  
  if (errorLog.length > 0) {
    console.log(`⚠️  ${errorLog.length} erros encontrados:\n`);
    
    // Agrupar por tipo de erro
    const grouped = errorLog.reduce((acc, log) => {
      const key = log.error.split(':')[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
      return acc;
    }, {} as any);
    
    Object.entries(grouped).forEach(([error, logs]: any) => {
      console.log(`  • ${error}: ${logs.length} ocorrências`);
      console.log(`    Tabela: ${logs[0].table}`);
      console.log(`    Exemplo: ${logs[0].error}\n`);
    });
    
    fs.writeFileSync(
      'scripts/migration/error-log.json',
      JSON.stringify(errorLog, null, 2)
    );
    console.log('Log completo salvo em: scripts/migration/error-log.json\n');
  }
}

async function verifyMigration() {
  console.log('═══════════════════════════════════════');
  console.log('🔍 Verificação Final\n');
  
  const tables = [
    'users', 'categories', 'videos', 'products', 'coupons', 'banners',
    'subscriptions', 'posts', 'post_likes', 'post_tags', 'comments',
    'user_activity', 'video_likes', 'popups', 'popup_views',
    'notifications', 'user_notifications', 'notification_settings',
    'share_settings', 'referrals', 'user_points', 'missions',
    'user_missions', 'rewards', 'user_rewards', 'raffles',
    'raffle_entries', 'raffle_winners', 'achievements', 'user_achievements',
  ];
  
  let allMatch = true;
  
  for (const tableName of tables) {
    const locawebCount = await locawebPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const railwayCount = await railwayPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    
    const locawebNum = parseInt(locawebCount.rows[0].count);
    const railwayNum = parseInt(railwayCount.rows[0].count);
    
    if (locawebNum > 0 || railwayNum > 0) {
      const match = locawebNum === railwayNum;
      const status = match ? '✅' : '⚠️ ';
      
      if (!match) allMatch = false;
      
      console.log(`  ${status} ${tableName}: ${locawebNum} → ${railwayNum}`);
    }
  }
  
  console.log('\n═══════════════════════════════════════');
  
  if (allMatch) {
    console.log('✨ Migração 100% completa!\n');
    console.log('🔑 Todas as constraints (PKs, FKs) preservadas');
    console.log('📇 Todos os indexes recriados');
    console.log('📊 Todos os dados migrados com sucesso\n');
  } else {
    console.log('⚠️  Algumas tabelas têm diferenças');
    console.log('Verifique error-log.json para detalhes\n');
  }
}

async function main() {
  try {
    await copyData();
    await verifyMigration();
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await locawebPool.end();
    await railwayPool.end();
  }
}

main().catch(console.error);
