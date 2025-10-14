

import pg from 'pg';
const { Pool } = pg;

console.log('🔍 Verificando conexão com Railway PostgreSQL...\n');

console.log('📋 Credenciais configuradas:');
console.log(`  Host: ${process.env.RAILWAY_DB_HOST || 'NÃO CONFIGURADO'}`);
console.log(`  Port: ${process.env.RAILWAY_DB_PORT || 'NÃO CONFIGURADO'}`);
console.log(`  Database: ${process.env.RAILWAY_DB_NAME || 'NÃO CONFIGURADO'}`);
console.log(`  User: ${process.env.RAILWAY_DB_USER || 'NÃO CONFIGURADO'}`);
console.log(`  Password: ${process.env.RAILWAY_DB_PASSWORD ? '***configurado***' : 'NÃO CONFIGURADO'}`);

const railwayPool = new Pool({
  host: process.env.RAILWAY_DB_HOST,
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME,
  user: process.env.RAILWAY_DB_USER,
  password: process.env.RAILWAY_DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function checkConnection() {
  try {
    console.log('\n📡 Testando conexão...');
    const client = await railwayPool.connect();
    
    // Info da conexão
    const connInfo = await client.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        inet_server_addr() as server_ip,
        inet_server_port() as server_port,
        version() as version
    `);
    
    console.log('\n✅ CONECTADO COM SUCESSO!\n');
    console.log('═══════════════════════════════════════');
    console.log('Informações da Conexão Ativa:');
    console.log('═══════════════════════════════════════');
    console.log(`Database: ${connInfo.rows[0].database}`);
    console.log(`User: ${connInfo.rows[0].user}`);
    console.log(`Server IP: ${connInfo.rows[0].server_ip || 'N/A'}`);
    console.log(`Server Port: ${connInfo.rows[0].server_port || 'N/A'}`);
    console.log(`Version: ${connInfo.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    // Listar tabelas
    const tables = await client.query(`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('\n═══════════════════════════════════════');
    console.log(`📊 TABELAS NO BANCO (${tables.rows.length} encontradas):`);
    console.log('═══════════════════════════════════════\n');
    
    if (tables.rows.length > 0) {
      tables.rows.forEach((table, index) => {
        console.log(`${(index + 1).toString().padStart(2, '0')}. ${table.tablename}`);
      });
    } else {
      console.log('⚠️  NENHUMA TABELA ENCONTRADA!');
    }
    
    // Contar registros em cada tabela
    console.log('\n═══════════════════════════════════════');
    console.log('📈 Contagem de registros:');
    console.log('═══════════════════════════════════════\n');
    
    for (const table of tables.rows) {
      try {
        const count = await client.query(`SELECT COUNT(*) FROM ${table.tablename}`);
        console.log(`${table.tablename}: ${count.rows[0].count} registros`);
      } catch (err) {
        console.log(`${table.tablename}: erro ao contar`);
      }
    }
    
    client.release();
    
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Verificação concluída!');
    console.log('═══════════════════════════════════════\n');
    
    console.log('💡 IMPORTANTE:');
    console.log('Se você está vendo isso no Replit mas não vê');
    console.log('as tabelas no painel do Railway, certifique-se de:');
    console.log('1. Estar conectado ao banco correto no painel');
    console.log('2. Ter selecionado o schema "public"');
    console.log('3. Atualizar a página do painel\n');
    
  } catch (error) {
    console.error('\n❌ ERRO AO CONECTAR:');
    console.error('Mensagem:', error.message);
    console.error('\n💡 Verifique:');
    console.error('1. As credenciais no arquivo .env');
    console.error('2. Se o banco Railway está ativo');
    console.error('3. Se o IP está permitido no firewall');
  } finally {
    await railwayPool.end();
  }
}

checkConnection().catch(console.error);
