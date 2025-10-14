import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
  host: process.env.RAILWAY_DB_HOST?.trim(),
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME?.trim(),
  user: process.env.RAILWAY_DB_USER?.trim(),
  password: process.env.RAILWAY_DB_PASSWORD?.trim(),
  ssl: {
    rejectUnauthorized: false,
  },
};

console.log('Testando conexão com Railway...');
console.log('Config:', { ...dbConfig, password: '***' });

const pool = new Pool(dbConfig);

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida!');
    
    // Listar tabelas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\nTabelas encontradas:');
    console.log(result.rows);
    
    // Contar usuários se a tabela existir
    if (result.rows.some((r: any) => r.table_name === 'users')) {
      const usersCount = await client.query('SELECT COUNT(*) FROM users');
      console.log('\nTotal de usuários:', usersCount.rows[0].count);
      
      // Buscar o usuário admin
      const admin = await client.query(`SELECT id, email, name FROM users WHERE email = 'admin@belezacomluci.com'`);
      console.log('\nUsuário admin:', admin.rows);
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error);
    await pool.end();
  }
}

testConnection();
