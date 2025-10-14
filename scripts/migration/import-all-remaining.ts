
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

// TODAS as tabelas na ordem correta de dependências
const allTables = [
  // Tabelas independentes primeiro
  'categories',
  'videos',
  'products',
  'coupons',
  'banners',
  'popups',
  'notifications',
  'share_settings',
  'missions',
  'rewards',
  'raffles',
  'achievements',
  
  // Tabelas que dependem de users (já importadas algumas)
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

async function getTableCount(tableName: string): Promise<number> {
  try {
    const result = await railwayPool.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  } catch {
    return 0;
  }
}

async function importTable(tableName: string) {
  try {
    const backupFile = path.join(backupDir, `${tableName}.json`);
    
    if (!fs.existsSync(backupFile)) {
      console.log(`⏭️  ${tableName}: sem arquivo de backup`);
      return { table: tableName, imported: 0, skipped: 0, noBackup: true };
    }
    
    const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    
    if (data.length === 0) {
      console.log(`⏭️  ${tableName}: backup vazio`);
      return { table: tableName, imported: 0, skipped: 0, empty: true };
    }
    
    const currentCount = await getTableCount(tableName);
    console.log(`📥 ${tableName}: ${data.length} no backup, ${currentCount} no Railway`);
    
    let imported = 0;
    let skipped = 0;
    let errors: string[] = [];
    
    for (const row of data) {
      try {
        // Filtrar campos undefined
        const cleanRow: any = {};
        Object.keys(row).forEach(key => {
          if (row[key] !== undefined) {
            cleanRow[key] = row[key];
          }
        });
        
        const columns = Object.keys(cleanRow);
        const values = Object.values(cleanRow);
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
        if (errors.length < 3 && !errors.includes(err.message)) {
          errors.push(err.message);
        }
      }
    }
    
    const finalCount = await getTableCount(tableName);
    const status = imported > 0 ? '✅' : finalCount === data.length ? '✓' : skipped > 0 ? '⚠️' : '⏭️';
    
    console.log(`${status} ${tableName}: ${imported} importados, ${skipped} pulados (total: ${finalCount}/${data.length})`);
    
    if (errors.length > 0) {
      console.log(`  ⚠️  Erros: ${errors[0].substring(0, 80)}...`);
    }
    
    return { 
      table: tableName, 
      imported, 
      skipped, 
      backupCount: data.length,
      finalCount,
      errors: errors.length 
    };
  } catch (error: any) {
    console.error(`❌ ${tableName}: ${error.message}`);
    return { table: tableName, imported: 0, skipped: 0, error: error.message };
  }
}

async function main() {
  console.log('🚀 IMPORTAÇÃO COMPLETA - SEM PULAR NADA\n');
  console.log('═══════════════════════════════════════\n');
  
  // Verificar usuários
  const usersCount = await getTableCount('users');
  console.log(`👥 Usuários no Railway: ${usersCount}\n`);
  
  if (usersCount === 0) {
    console.log('❌ ERRO: Nenhum usuário encontrado! Execute primeiro fix-admin-social-links.ts\n');
    await railwayPool.end();
    return;
  }
  
  const results: any[] = [];
  let totalImported = 0;
  let totalSkipped = 0;
  let tablesWithErrors: string[] = [];
  
  for (const table of allTables) {
    const result = await importTable(table);
    results.push(result);
    
    if (!result.noBackup && !result.empty && !result.error) {
      totalImported += result.imported;
      totalSkipped += result.skipped;
      
      if (result.errors && result.errors > 0) {
        tablesWithErrors.push(table);
      }
    }
  }
  
  console.log('\n📊 RESUMO DETALHADO DA IMPORTAÇÃO');
  console.log('═══════════════════════════════════════\n');
  
  // Categorizar resultados
  const successful = results.filter(r => !r.error && !r.noBackup && !r.empty && r.imported > 0);
  const complete = results.filter(r => !r.error && !r.noBackup && !r.empty && r.finalCount === r.backupCount && r.imported === 0);
  const partial = results.filter(r => !r.error && !r.noBackup && !r.empty && r.finalCount < r.backupCount);
  const withErrors = results.filter(r => r.error);
  const noData = results.filter(r => r.noBackup || r.empty);
  
  if (successful.length > 0) {
    console.log('✅ IMPORTADOS COM SUCESSO:');
    successful.forEach(r => {
      console.log(`   ${r.table}: ${r.imported} novos registros (${r.finalCount}/${r.backupCount} total)`);
    });
    console.log('');
  }
  
  if (complete.length > 0) {
    console.log('✓  JÁ COMPLETOS (100%):');
    complete.forEach(r => {
      console.log(`   ${r.table}: ${r.finalCount}/${r.backupCount}`);
    });
    console.log('');
  }
  
  if (partial.length > 0) {
    console.log('⚠️  PARCIALMENTE IMPORTADOS:');
    partial.forEach(r => {
      const percent = Math.round((r.finalCount / r.backupCount) * 100);
      console.log(`   ${r.table}: ${r.finalCount}/${r.backupCount} (${percent}%) - faltam ${r.backupCount - r.finalCount}`);
    });
    console.log('');
  }
  
  if (withErrors.length > 0) {
    console.log('❌ ERROS:');
    withErrors.forEach(r => {
      console.log(`   ${r.table}: ${r.error}`);
    });
    console.log('');
  }
  
  if (noData.length > 0) {
    console.log('⏭️  SEM DADOS:');
    noData.forEach(r => {
      const reason = r.noBackup ? 'sem backup' : 'vazio';
      console.log(`   ${r.table} (${reason})`);
    });
    console.log('');
  }
  
  console.log('═══════════════════════════════════════');
  console.log(`📈 Total importado: ${totalImported} registros`);
  console.log(`⏭️  Total pulado: ${totalSkipped} registros`);
  
  // Verificação final
  console.log('\n🔍 VERIFICAÇÃO FINAL:');
  let allComplete = true;
  
  for (const table of allTables) {
    const backupFile = path.join(backupDir, `${table}.json`);
    if (fs.existsSync(backupFile)) {
      const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      if (data.length > 0) {
        const count = await getTableCount(table);
        if (count < data.length) {
          console.log(`   ⚠️  ${table}: ${count}/${data.length} (faltam ${data.length - count})`);
          allComplete = false;
        } else {
          console.log(`   ✓  ${table}: ${count}/${data.length} (100%)`);
        }
      }
    }
  }
  
  console.log('');
  if (allComplete) {
    console.log('🎉 MIGRAÇÃO 100% COMPLETA!');
  } else {
    console.log('⚠️  Algumas tabelas ainda não estão completas');
    console.log('   Execute novamente este script para tentar importar os dados faltantes');
  }
  
  await railwayPool.end();
  console.log('\n✨ Processo finalizado!');
}

main().catch(console.error);
