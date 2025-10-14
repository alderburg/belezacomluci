
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const backupDir = path.join(process.cwd(), 'scripts/migration/backup');

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

async function fixAdminUser() {
  console.log('🔧 Corrigindo usuário admin...\n');
  
  try {
    const usersFile = path.join(backupDir, 'users.json');
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    
    const admin = users.find((u: any) => u.username === 'admin');
    
    if (!admin) {
      console.log('❌ Usuário admin não encontrado no backup');
      return;
    }
    
    // Preparar dados corrigidos
    const userData = {
      ...admin,
      social_media_links: admin.social_media_links || null
    };
    
    // Se social_media_links for string, tentar fazer parse
    if (typeof userData.social_media_links === 'string') {
      try {
        userData.social_media_links = JSON.parse(userData.social_media_links);
      } catch {
        userData.social_media_links = null;
      }
    }
    
    // Se ainda não for array válido, definir como null
    if (!Array.isArray(userData.social_media_links)) {
      userData.social_media_links = null;
    }
    
    console.log('📋 Dados do admin a serem importados:');
    console.log('Username:', userData.username);
    console.log('Email:', userData.email);
    console.log('Social media links:', JSON.stringify(userData.social_media_links));
    
    // Inserir no Railway
    const columns = Object.keys(userData);
    const values = Object.values(userData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO users (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (username) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        password_hash = EXCLUDED.password_hash,
        is_admin = EXCLUDED.is_admin,
        is_premium = EXCLUDED.is_premium,
        social_media_links = EXCLUDED.social_media_links,
        updated_at = NOW()
    `;
    
    await railwayPool.query(query, values);
    
    console.log('\n✅ Usuário admin importado com sucesso!');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  } finally {
    await railwayPool.end();
  }
}

fixAdminUser();
