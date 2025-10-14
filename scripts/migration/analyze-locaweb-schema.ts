import { Pool } from 'pg';
import * as fs from 'fs';

const locawebPool = new Pool({
  host: process.env.LOCAWEB_DB_HOST?.trim(),
  port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
  database: process.env.LOCAWEB_DB_NAME?.trim(),
  user: process.env.LOCAWEB_DB_USER?.trim(),
  password: process.env.LOCAWEB_DB_PASSWORD?.trim(),
  ssl: false,
});

async function analyzeSchema() {
  console.log('🔍 Analisando schema da Locaweb...\n');
  
  // Obter todas as tabelas
  const tablesResult = await locawebPool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  const schema: any = {};
  
  for (const table of tablesResult.rows) {
    const tableName = table.table_name;
    console.log(`📋 Analisando: ${tableName}`);
    
    // Colunas
    const columns = await locawebPool.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    
    // Primary keys
    const pks = await locawebPool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary;
    `, [tableName]);
    
    // Foreign keys
    const fks = await locawebPool.query(`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = $1;
    `, [tableName]);
    
    // Indexes
    const indexes = await locawebPool.query(`
      SELECT
        i.relname as index_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = $1
        AND t.relnamespace = 'public'::regnamespace
        AND NOT ix.indisprimary;
    `, [tableName]);
    
    schema[tableName] = {
      columns: columns.rows,
      primaryKeys: pks.rows.map(r => r.attname),
      foreignKeys: fks.rows,
      indexes: indexes.rows
    };
  }
  
  // Salvar análise
  fs.writeFileSync(
    'scripts/migration/locaweb-schema.json',
    JSON.stringify(schema, null, 2)
  );
  
  console.log('\n✅ Análise completa salva em: scripts/migration/locaweb-schema.json');
  
  await locawebPool.end();
}

analyzeSchema().catch(console.error);
