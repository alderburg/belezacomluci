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

async function cleanRailway() {
  console.log('🗑️  Limpando Railway...\n');
  
  // Drop todas as tabelas
  await railwayPool.query('DROP SCHEMA public CASCADE;');
  await railwayPool.query('CREATE SCHEMA public;');
  await railwayPool.query('GRANT ALL ON SCHEMA public TO public;');
  
  console.log('✅ Railway limpo!\n');
}

async function copyData() {
  console.log('📊 Copiando dados da Locaweb...\n');
  
  // Ordem de inserção respeitando foreign keys
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
      // Buscar dados da Locaweb
      const data = await locawebPool.query(`SELECT * FROM "${tableName}"`);
      
      if (data.rows.length === 0) {
        console.log(`  ⚪ ${tableName}: vazio`);
        continue;
      }
      
      // Inserir no Railway
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
          // Log erro mas continua
          errorLog.push({
            table: tableName,
            row: row,
            error: err.message,
          });
        }
      }
      
      console.log(`  ✅ ${tableName}: ${inserted}/${data.rows.length} registros`);
      totalRecords += inserted;
      
    } catch (err: any) {
      console.error(`  ❌ ${tableName}: ${err.message}`);
    }
  }
  
  console.log(`\n📊 Total: ${totalRecords} registros migrados\n`);
  
  if (errorLog.length > 0) {
    console.log(`⚠️  ${errorLog.length} erros encontrados. Salvando log...`);
    fs.writeFileSync(
      'scripts/migration/error-log.json',
      JSON.stringify(errorLog, null, 2)
    );
  }
}

async function verifyMigration() {
  console.log('🔍 Verificando migração...\n');
  
  const locawebResult = await locawebPool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  for (const table of locawebResult.rows) {
    const tableName = table.table_name;
    
    const locawebCount = await locawebPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const railwayCount = await railwayPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    
    const locawebNum = parseInt(locawebCount.rows[0].count);
    const railwayNum = parseInt(railwayCount.rows[0].count);
    
    if (locawebNum > 0 || railwayNum > 0) {
      const status = locawebNum === railwayNum ? '✅' : '⚠️ ';
      console.log(`  ${status} ${tableName}: Locaweb ${locawebNum} → Railway ${railwayNum}`);
    }
  }
}

async function main() {
  try {
    console.log('🚀 Migração Completa: Locaweb → Railway\n');
    console.log('═══════════════════════════════════════\n');
    
    // Passo 1: Limpar Railway
    await cleanRailway();
    
    // Passo 2: Aguardar criação do schema via Drizzle
    console.log('⏳ Execute: npm run db:push --force\n');
    console.log('Pressione ENTER após executar...');
    
    // Aguardar input do usuário
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    // Passo 3: Copiar dados
    await copyData();
    
    // Passo 4: Verificar
    await verifyMigration();
    
    console.log('\n═══════════════════════════════════════');
    console.log('✨ Migração concluída!\n');
    
  } catch (error: any) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  } finally {
    await locawebPool.end();
    await railwayPool.end();
  }
}

main().catch(console.error);
