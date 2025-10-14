
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

async function fixUsersImport() {
  console.log('🔧 Corrigindo importação de usuários...\n');
  
  try {
    const usersFile = path.join(backupDir, 'users.json');
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    
    console.log(`📥 Tentando importar ${users.length} usuários...\n`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const user of users) {
      try {
        // Converter campos JSON string para objetos se necessário
        const userData = { ...user };
        
        // Se social_media_links for string, converter para objeto
        if (typeof userData.social_media_links === 'string') {
          try {
            userData.social_media_links = JSON.parse(userData.social_media_links);
          } catch {
            userData.social_media_links = null;
          }
        }
        
        const columns = Object.keys(userData).filter(k => userData[k] !== undefined);
        const values = columns.map(k => userData[k]);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO "users" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            email = EXCLUDED.email,
            name = EXCLUDED.name,
            password = EXCLUDED.password,
            avatar = EXCLUDED.avatar,
            is_admin = EXCLUDED.is_admin
        `;
        
        await railwayPool.query(query, values);
        imported++;
        console.log(`  ✅ Importado: ${userData.username} (${userData.email})`);
      } catch (err: any) {
        console.error(`  ⚠️  Erro ao importar ${user.username}: ${err.message}`);
        skipped++;
      }
    }
    
    console.log(`\n✅ Usuários: ${imported} importados, ${skipped} com erro\n`);
    
    // Agora importar as tabelas dependentes
    await importDependentTables();
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await railwayPool.end();
  }
}

async function importDependentTables() {
  console.log('📥 Importando tabelas dependentes...\n');
  
  const tables = [
    'subscriptions',
    'posts',
    'post_likes',
    'post_tags',
    'comments',
    'user_activity',
    'notification_settings',
    'user_missions'
  ];
  
  for (const tableName of tables) {
    try {
      const backupFile = path.join(backupDir, `${tableName}.json`);
      
      if (!fs.existsSync(backupFile)) {
        console.log(`⏭️  ${tableName}: sem backup`);
        continue;
      }
      
      const data = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
      
      if (data.length === 0) {
        console.log(`⏭️  ${tableName}: vazio`);
        continue;
      }
      
      let imported = 0;
      let skipped = 0;
      
      for (const row of data) {
        try {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          
          const query = `
            INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
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
        }
      }
      
      console.log(`  ${imported > 0 ? '✅' : '⏭️'}  ${tableName}: ${imported} importados, ${skipped} pulados`);
    } catch (error: any) {
      console.error(`  ❌ ${tableName}: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Importação concluída!\n');
}

fixUsersImport().catch(console.error);
