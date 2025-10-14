import { Pool } from 'pg';

async function testConnection() {
  console.log('🔍 Testando conexão com Railway...\n');
  
  const config = {
    host: process.env.RAILWAY_DB_HOST,
    port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
    database: process.env.RAILWAY_DB_NAME,
    user: process.env.RAILWAY_DB_USER,
    password: process.env.RAILWAY_DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false,
    },
  };
  
  console.log('📋 Configuração:');
  console.log('  Host:', config.host);
  console.log('  Port:', config.port);
  console.log('  Database:', config.database);
  console.log('  User:', config.user);
  console.log('  Password:', config.password ? '***' + config.password.slice(-4) : 'NONE');
  console.log('  SSL:', config.ssl ? 'Enabled' : 'Disabled');
  console.log();
  
  const pool = new Pool(config);
  
  try {
    console.log('🔌 Tentando conectar...');
    const client = await pool.connect();
    
    console.log('✅ Conexão estabelecida com sucesso!\n');
    
    const result = await client.query('SELECT version(), current_database(), current_user, NOW()');
    console.log('📊 Informações do servidor:');
    console.log('  Versão PostgreSQL:', result.rows[0].version);
    console.log('  Database atual:', result.rows[0].current_database);
    console.log('  Usuário atual:', result.rows[0].current_user);
    console.log('  Horário do servidor:', result.rows[0].now);
    console.log();
    
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tabelas existentes:', tablesResult.rows.length);
    tablesResult.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    
    client.release();
    console.log('\n✨ Teste concluído com sucesso!');
  } catch (error: any) {
    console.error('\n❌ Erro ao conectar:');
    console.error('  Mensagem:', error.message);
    console.error('  Código:', error.code);
    if (error.detail) console.error('  Detalhe:', error.detail);
    console.error('\n💡 Sugestões:');
    console.error('  - Verifique se as credenciais estão corretas');
    console.error('  - Confirme que o host e porta estão corretos');
    console.error('  - Verifique se o banco Railway está acessível');
  } finally {
    await pool.end();
  }
}

testConnection();
