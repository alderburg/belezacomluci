
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

// Tabelas que dependem de users, na ordem correta
const dependentTables = [
  'subscriptions',
  'posts',
  'post_likes',
  'post_tags',
  'comments',
  'user_activity',
  'video_likes',
  'popup_views',
  'user_notifications',
  'notification_settings',
  'referrals',
  'user_points',
  'user_missions',
  'user_rewards',
  'raffle_entries',
  'raffle_winners',
  'user_achievements'
];

async function importTable(tableName: string) {
  try {
    const backupFile = path.join(backupDir, `${tableName}.json`);
    
    if (!fs.existsSync(backupFile)) {
      console.log(`⏭️  ${tableName}: sem backup`);
      return { table: tableName, count: 0, skipped: true };
    }
    
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    
    if (data.length === 0) {
      console.log(`⏭️  ${tableName}: vazio`);
      return { table: tableName, count: 0, skipped: true };
    }
    
    console.log(`📥 Importando ${tableName} (${data.length} registros)...`);
    
    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];
    
    for (const row of data) {
      try {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${tableName} (${columns.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;
        
        const result = await railwayPool.query(query, values);
        if (result.rowCount && result.rowCount > 0) {
          imported++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        skipped++;
        if (errors.length < 3) {
          errors.push(err.message);
        }
      }
    }
    
    const status = imported > 0 ? '✅' : skipped === data.length ? '⏭️' : '⚠️';
    console.log(`${status} ${tableName}: ${imported} importados, ${skipped} pulados`);
    
    if (errors.length > 0) {
      console.log(`  Exemplos de erros: ${errors[0]}`);
    }
    
    return { table: tableName, count: imported, skipped };
  } catch (error: any) {
    console.error(`❌ Erro ao importar ${tableName}:`, error.message);
    return { table: tableName, count: 0, error: error.message };
  }
}

async function main() {
  console.log('🚀 Importando tabelas dependentes de usuários...\n');
  
  // Verificar se há usuários no Railway
  const usersCount = await railwayPool.query('SELECT COUNT(*) FROM users');
  const totalUsers = parseInt(usersCount.rows[0].count);
  
  console.log(`👥 Total de usuários no Railway: ${totalUsers}\n`);
  
  if (totalUsers === 0) {
    console.log('❌ Nenhum usuário encontrado! Execute primeiro o script de importação de usuários.\n');
    await railwayPool.end();
    return;
  }
  
  const results = [];
  let totalImported = 0;
  
  for (const table of dependentTables) {
    const result = await importTable(table);
    results.push(result);
    if (!result.skipped && !result.error) {
      totalImported += result.count;
    }
  }
  
  console.log('\n📊 Resumo da Importação:');
  console.log('═══════════════════════════════════════');
  
  results.forEach(r => {
    if (r.error) {
      console.log(`❌ ${r.table}: ERRO - ${r.error}`);
    } else if (r.skipped) {
      console.log(`⏭️  ${r.table}: PULADO`);
    } else {
      console.log(`✅ ${r.table}: ${r.count} registros`);
    }
  });
  
  console.log('═══════════════════════════════════════');
  console.log(`📈 Total de registros importados: ${totalImported}`);
  
  await railwayPool.end();
  console.log('\n✨ Importação concluída!');
}

main().catch(console.error);
