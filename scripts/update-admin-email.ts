
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

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

async function updateAdminEmail() {
  try {
    console.log('🔄 Atualizando email do admin...');
    
    // Buscar admin atual
    const checkResult = await railwayPool.query(`
      SELECT id, email, username, name 
      FROM users 
      WHERE email = 'admin@belezacomluci.com' OR username = 'admin'
      LIMIT 1
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    const admin = checkResult.rows[0];
    console.log('✅ Admin encontrado:', {
      id: admin.id,
      username: admin.username,
      email_atual: admin.email
    });
    
    // Atualizar email
    await railwayPool.query(`
      UPDATE users 
      SET email = 'lucasgabriel@gmail.com'
      WHERE id = $1
    `, [admin.id]);
    
    console.log('✅ Email atualizado com sucesso!');
    console.log('📧 Novo email: lucasgabriel@gmail.com');
    
    // Verificar atualização
    const verifyResult = await railwayPool.query(`
      SELECT email FROM users WHERE id = $1
    `, [admin.id]);
    
    console.log('🔍 Verificação:', verifyResult.rows[0]);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao atualizar email:', error);
    process.exit(1);
  } finally {
    await railwayPool.end();
  }
}

updateAdminEmail();
