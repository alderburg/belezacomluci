
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.RAILWAY_DB_HOST?.trim(),
  port: parseInt(process.env.RAILWAY_DB_PORT || '5432'),
  database: process.env.RAILWAY_DB_NAME?.trim(),
  user: process.env.RAILWAY_DB_USER?.trim(),
  password: process.env.RAILWAY_DB_PASSWORD?.trim(),
  ssl: {
    rejectUnauthorized: false,
  },
});

async function clearAnalyticsTables() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Iniciando limpeza das tabelas de analytics...\n');
    
    await client.query('BEGIN');
    
    // 1. Contar registros antes de apagar
    console.log('📊 Contando registros antes da limpeza:');
    
    const bioClicksCount = await client.query('SELECT COUNT(*) as count FROM bio_clicks');
    const pageViewsCount = await client.query('SELECT COUNT(*) as count FROM page_views');
    const analyticsTargetsCount = await client.query('SELECT COUNT(*) as count FROM analytics_targets');
    
    console.log(`   - bio_clicks: ${bioClicksCount.rows[0].count} registros`);
    console.log(`   - page_views: ${pageViewsCount.rows[0].count} registros`);
    console.log(`   - analytics_targets: ${analyticsTargetsCount.rows[0].count} registros\n`);
    
    // 2. Apagar tabelas na ordem correta (primeiro os filhos, depois os pais)
    console.log('🔥 Apagando registros...');
    
    // Apagar bio_clicks primeiro (tem FK para analytics_targets)
    await client.query('TRUNCATE TABLE bio_clicks RESTART IDENTITY CASCADE');
    console.log('   ✅ bio_clicks limpo');
    
    // Apagar page_views (tem FK para analytics_targets)
    await client.query('TRUNCATE TABLE page_views RESTART IDENTITY CASCADE');
    console.log('   ✅ page_views limpo');
    
    // Apagar analytics_targets por último (é a tabela pai)
    await client.query('TRUNCATE TABLE analytics_targets RESTART IDENTITY CASCADE');
    console.log('   ✅ analytics_targets limpo\n');
    
    await client.query('COMMIT');
    
    // 3. Verificar se tudo foi apagado
    console.log('🔍 Verificando limpeza...');
    
    const finalBioClicks = await client.query('SELECT COUNT(*) as count FROM bio_clicks');
    const finalPageViews = await client.query('SELECT COUNT(*) as count FROM page_views');
    const finalTargets = await client.query('SELECT COUNT(*) as count FROM analytics_targets');
    
    console.log(`   - bio_clicks: ${finalBioClicks.rows[0].count} registros`);
    console.log(`   - page_views: ${finalPageViews.rows[0].count} registros`);
    console.log(`   - analytics_targets: ${finalTargets.rows[0].count} registros\n`);
    
    if (finalBioClicks.rows[0].count === '0' && 
        finalPageViews.rows[0].count === '0' && 
        finalTargets.rows[0].count === '0') {
      console.log('✅ Todas as tabelas foram limpas com sucesso!');
      console.log('🎉 Você pode testar o sistema de analytics do zero agora!');
    } else {
      console.log('⚠️  Algumas tabelas ainda têm registros. Verifique manualmente.');
    }
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro durante a limpeza:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar o script
clearAnalyticsTables()
  .then(() => {
    console.log('\n🏁 Script finalizado!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('💥 Erro fatal:', err);
    process.exit(1);
  });
