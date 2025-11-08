
import { Pool } from 'pg';

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

async function main() {
  console.log('🚀 Iniciando migração: Adicionando course_id à tabela banners\n');
  
  try {
    // Verificar se a coluna já existe
    const checkColumn = await railwayPool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'banners' 
        AND column_name = 'course_id'
        AND table_schema = 'public';
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('⚠️  A coluna course_id já existe na tabela banners');
      console.log('✅ Migração já foi aplicada anteriormente\n');
      await railwayPool.end();
      return;
    }
    
    console.log('📝 Adicionando coluna course_id à tabela banners...');
    
    // Adicionar a coluna course_id com tipo VARCHAR (mesmo tipo do products.id)
    await railwayPool.query(`
      ALTER TABLE banners 
      ADD COLUMN course_id VARCHAR;
    `);
    
    console.log('✅ Coluna course_id adicionada com sucesso');
    
    // Verificar se existem valores inválidos
    console.log('🔍 Verificando dados existentes...');
    
    const invalidData = await railwayPool.query(`
      SELECT b.id, b.course_id 
      FROM banners b
      WHERE b.course_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM products p WHERE p.id = b.course_id
        );
    `);
    
    if (invalidData.rows.length > 0) {
      console.log(`⚠️  Encontrados ${invalidData.rows.length} registros com course_id inválido`);
      console.log('🧹 Limpando valores inválidos...');
      
      await railwayPool.query(`
        UPDATE banners 
        SET course_id = NULL 
        WHERE course_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM products p WHERE p.id = banners.course_id
          );
      `);
      
      console.log('✅ Valores inválidos removidos');
    } else {
      console.log('✅ Nenhum dado inválido encontrado');
    }
    
    // Adicionar foreign key constraint
    console.log('🔗 Adicionando constraint de foreign key...');
    
    await railwayPool.query(`
      ALTER TABLE banners 
      ADD CONSTRAINT banners_course_id_products_id_fk 
      FOREIGN KEY (course_id) 
      REFERENCES products(id) 
      ON DELETE CASCADE;
    `);
    
    console.log('✅ Foreign key constraint adicionada com sucesso');
    
    // Verificar resultado
    const verify = await railwayPool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'banners' 
        AND column_name = 'course_id'
        AND table_schema = 'public';
    `);
    
    console.log('\n📊 Verificação da coluna criada:');
    console.log('═══════════════════════════════════════');
    console.log(`Nome: ${verify.rows[0].column_name}`);
    console.log(`Tipo: ${verify.rows[0].data_type}`);
    console.log(`Nullable: ${verify.rows[0].is_nullable}`);
    console.log('═══════════════════════════════════════');
    
    // Verificar constraint
    const verifyConstraint = await railwayPool.query(`
      SELECT 
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'banners'
        AND kcu.column_name = 'course_id';
    `);
    
    if (verifyConstraint.rows.length > 0) {
      console.log('\n🔗 Foreign key constraint verificada:');
      console.log('═══════════════════════════════════════');
      console.log(`Constraint: ${verifyConstraint.rows[0].constraint_name}`);
      console.log(`Referencia: ${verifyConstraint.rows[0].foreign_table_name}(${verifyConstraint.rows[0].foreign_column_name})`);
      console.log('═══════════════════════════════════════');
    }
    
    console.log('\n✨ Migração concluída com sucesso!');
    console.log('🎉 A coluna course_id está pronta para uso na tabela banners!\n');
    
  } catch (error: any) {
    console.error('\n❌ Erro ao aplicar migração:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await railwayPool.end();
  }
}

main().catch(console.error);
