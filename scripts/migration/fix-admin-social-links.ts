
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
    
    // Mapear campos antigos para novos
    const userData: any = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      password: admin.password_hash || admin.password,
      name: admin.full_name || admin.name || 'Admin',
      cpf: admin.cpf || null,
      avatar: admin.avatar || null,
      gender: admin.gender || null,
      age: admin.age || null,
      phone: admin.phone || null,
      phone_type: admin.phone_type || null,
      zip_code: admin.zip_code || null,
      street: admin.street || null,
      number: admin.number || null,
      complement: admin.complement || null,
      neighborhood: admin.neighborhood || null,
      city: admin.city || null,
      state: admin.state || null,
      is_admin: admin.is_admin || false,
      created_at: admin.created_at || new Date().toISOString()
    };
    
    // Converter social_media_links para social_networks
    let socialNetworks = [];
    if (admin.social_media_links && admin.social_media_links !== 'undefined') {
      try {
        if (typeof admin.social_media_links === 'string') {
          socialNetworks = JSON.parse(admin.social_media_links);
        } else if (Array.isArray(admin.social_media_links)) {
          socialNetworks = admin.social_media_links;
        }
      } catch {
        socialNetworks = [];
      }
    }
    userData.social_networks = JSON.stringify(socialNetworks);
    
    console.log('📋 Dados do admin a serem importados:');
    console.log('Username:', userData.username);
    console.log('Email:', userData.email);
    console.log('Social networks:', userData.social_networks);
    
    // Inserir no Railway
    const columns = Object.keys(userData);
    const values = Object.values(userData);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    const updateCols = columns
      .filter(c => c !== 'id' && c !== 'created_at')
      .map(c => `${c} = EXCLUDED.${c}`)
      .join(', ');
    
    const query = `
      INSERT INTO users (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (username) DO UPDATE SET
        ${updateCols}
    `;
    
    await railwayPool.query(query, values);
    
    console.log('\n✅ Usuário admin importado com sucesso!');
    
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await railwayPool.end();
  }
}

fixAdminUser();
