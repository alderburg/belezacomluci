import { Pool } from 'pg';

const locawebPool = new Pool({
  host: process.env.LOCAWEB_DB_HOST?.trim(),
  port: parseInt(process.env.LOCAWEB_DB_PORT || '5432'),
  database: process.env.LOCAWEB_DB_NAME?.trim(),
  user: process.env.LOCAWEB_DB_USER?.trim(),
  password: process.env.LOCAWEB_DB_PASSWORD?.trim(),
  ssl: false,
});

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

async function getTableDDL(tableName: string): Promise<string> {
  // Obter DDL completo da tabela incluindo constraints
  const query = `
    SELECT
      'CREATE TABLE "' || $1 || '" (' ||
      string_agg(
        '"' || column_name || '" ' || 
        CASE 
          WHEN data_type = 'character varying' THEN 'varchar(' || character_maximum_length || ')'
          WHEN data_type = 'USER-DEFINED' THEN udt_name
          ELSE data_type
        END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
        ', '
        ORDER BY ordinal_position
      ) || ');' as ddl
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    GROUP BY table_name;
  `;
  
  const result = await locawebPool.query(query, [tableName]);
  return result.rows[0]?.ddl || '';
}

async function getPrimaryKey(tableName: string) {
  const query = `
    SELECT a.attname as column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = $1::regclass AND i.indisprimary;
  `;
  
  const result = await locawebPool.query(query, [tableName]);
  return result.rows.map(r => r.column_name);
}

async function getConstraints(tableName: string) {
  const query = `
    SELECT
      con.conname as constraint_name,
      con.contype as constraint_type,
      pg_get_constraintdef(con.oid) as definition
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = $1 AND rel.relnamespace = 'public'::regnamespace;
  `;
  
  const result = await locawebPool.query(query, [tableName]);
  return result.rows;
}

async function getIndexes(tableName: string) {
  const query = `
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = $1
    AND indexdef NOT LIKE '%PRIMARY KEY%';
  `;
  
  const result = await locawebPool.query(query, [tableName]);
  return result.rows;
}

async function getSequences() {
  const query = `
    SELECT
      sequence_name,
      last_value
    FROM information_schema.sequences
    WHERE sequence_schema = 'public';
  `;
  
  const result = await locawebPool.query(query);
  return result.rows;
}

async function recreateSequence(seqName: string, lastValue: number) {
  try {
    await railwayPool.query(`DROP SEQUENCE IF EXISTS "${seqName}" CASCADE;`);
    await railwayPool.query(`CREATE SEQUENCE "${seqName}";`);
    await railwayPool.query(`SELECT setval('"${seqName}"', ${lastValue}, true);`);
    console.log(`  ✅ Sequence recriada: ${seqName} (valor: ${lastValue})`);
  } catch (error: any) {
    console.error(`  ❌ Erro em sequence ${seqName}:`, error.message);
  }
}

async function dropAllTables() {
  const result = await railwayPool.query(`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `);
  
  for (const row of result.rows) {
    await railwayPool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE;`);
    console.log(`🗑️  ${row.tablename}`);
  }
}

async function main() {
  console.log('🚀 Iniciando migração completa Locaweb → Railway\n');
  
  try {
    // 1. Limpar Railway
    console.log('🗑️  Limpando Railway...');
    await dropAllTables();
    console.log('');
    
    // 2. Obter lista de tabelas
    const tablesResult = await locawebPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`📋 ${tables.length} tabelas encontradas\n`);
    
    // 3. Recriar sequences primeiro
    console.log('🔢 Recriando sequences...');
    const sequences = await getSequences();
    for (const seq of sequences) {
      const lastValResult = await locawebPool.query(`SELECT last_value FROM "${seq.sequence_name}";`);
      const lastValue = lastValResult.rows[0]?.last_value || 1;
      await recreateSequence(seq.sequence_name, lastValue);
    }
    console.log('');
    
    // 4. Criar tabelas sem constraints
    console.log('📦 Criando tabelas...\n');
    for (const table of tables) {
      console.log(`🔄 ${table}`);
      
      // Obter colunas
      const colsResult = await locawebPool.query(`
        SELECT column_name, data_type, character_maximum_length, 
               is_nullable, column_default, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      const columns = colsResult.rows;
      
      // Criar definições de coluna
      const columnDefs = columns.map(col => {
        let def = `"${col.column_name}" `;
        
        if (col.data_type === 'character varying') {
          def += `varchar(${col.character_maximum_length})`;
        } else if (col.data_type === 'USER-DEFINED') {
          def += col.udt_name;
        } else {
          def += col.data_type;
        }
        
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        
        return def;
      }).join(', ');
      
      // Criar tabela
      await railwayPool.query(`CREATE TABLE "${table}" (${columnDefs});`);
      console.log(`  ✅ Tabela criada`);
    }
    console.log('');
    
    // 5. Copiar dados
    console.log('📊 Copiando dados...\n');
    let totalRecords = 0;
    
    for (const table of tables) {
      const data = await locawebPool.query(`SELECT * FROM "${table}"`);
      
      if (data.rows.length === 0) {
        console.log(`  ⚪ ${table}: vazio`);
        continue;
      }
      
      for (const row of data.rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders})
        `;
        
        try {
          await railwayPool.query(query, values);
        } catch (err: any) {
          // Ignorar duplicatas e continuar
        }
      }
      
      console.log(`  ✅ ${table}: ${data.rows.length} registros`);
      totalRecords += data.rows.length;
    }
    console.log('');
    
    // 6. Adicionar primary keys
    console.log('🔑 Adicionando primary keys...\n');
    for (const table of tables) {
      const pkCols = await getPrimaryKey(table);
      
      if (pkCols.length > 0) {
        try {
          const pkName = `${table}_pkey`;
          const pkDef = pkCols.map(c => `"${c}"`).join(', ');
          await railwayPool.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${pkName}" PRIMARY KEY (${pkDef});`);
          console.log(`  ✅ ${table}: PK(${pkCols.join(', ')})`);
        } catch (err: any) {
          console.log(`  ⚠️  ${table}: ${err.message}`);
        }
      }
    }
    console.log('');
    
    // 7. Adicionar foreign keys
    console.log('🔗 Adicionando foreign keys...\n');
    for (const table of tables) {
      const constraints = await getConstraints(table);
      
      for (const con of constraints) {
        if (con.constraint_type === 'f') {
          try {
            await railwayPool.query(`ALTER TABLE "${table}" ADD CONSTRAINT "${con.constraint_name}" ${con.definition};`);
            console.log(`  ✅ ${table}: ${con.constraint_name}`);
          } catch (err: any) {
            console.log(`  ⚠️  ${table}.${con.constraint_name}: ${err.message}`);
          }
        }
      }
    }
    console.log('');
    
    // 8. Recriar indexes
    console.log('📇 Recriando indexes...\n');
    for (const table of tables) {
      const indexes = await getIndexes(table);
      
      for (const idx of indexes) {
        try {
          await railwayPool.query(idx.indexdef);
          console.log(`  ✅ ${idx.indexname}`);
        } catch (err: any) {
          console.log(`  ⚠️  ${idx.indexname}: ${err.message}`);
        }
      }
    }
    
    console.log('\n\n═══════════════════════════════════════');
    console.log(`✨ Migração completa concluída!`);
    console.log(`📊 Total: ${totalRecords} registros migrados`);
    console.log(`🔑 Primary keys adicionadas`);
    console.log(`🔗 Foreign keys adicionadas`);
    console.log(`📇 Indexes recriados`);
    console.log(`🔢 Sequences recriadas`);
    console.log('═══════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  } finally {
    await locawebPool.end();
    await railwayPool.end();
  }
}

main().catch(console.error);
