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

async function getTableStructure(tableName: string) {
  const query = `
    SELECT 
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const result = await locawebPool.query(query, [tableName]);
  return result.rows;
}

async function dropTableIfExists(tableName: string) {
  try {
    await railwayPool.query(`DROP TABLE IF EXISTS "${tableName}" CASCADE;`);
    console.log(`🗑️  Removida tabela existente: ${tableName}`);
  } catch (error: any) {
    console.log(`⚠️  Não foi possível remover ${tableName}:`, error.message);
  }
}

async function createTableFromStructure(tableName: string, columns: any[]) {
  const columnDefs = columns.map(col => {
    let def = `"${col.column_name}" ${col.data_type}`;
    
    if (col.character_maximum_length) {
      def += `(${col.character_maximum_length})`;
    }
    
    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }
    
    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }
    
    return def;
  }).join(', ');
  
  const createQuery = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs});`;
  
  try {
    await railwayPool.query(createQuery);
    console.log(`✅ Tabela criada: ${tableName}`);
  } catch (error: any) {
    console.error(`❌ Erro ao criar ${tableName}:`, error.message);
    throw error;
  }
}

async function copyTableData(tableName: string) {
  try {
    const countResult = await locawebPool.query(`SELECT COUNT(*) FROM "${tableName}"`);
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log(`⏭️  ${tableName}: tabela vazia`);
      return 0;
    }
    
    const data = await locawebPool.query(`SELECT * FROM "${tableName}"`);
    
    if (data.rows.length === 0) {
      return 0;
    }
    
    for (const row of data.rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT DO NOTHING
      `;
      
      try {
        await railwayPool.query(query, values);
      } catch (err: any) {
        console.error(`   ⚠️  Erro ao inserir registro em ${tableName}:`, err.message);
      }
    }
    
    console.log(`📦 ${tableName}: ${data.rows.length} registros copiados`);
    return data.rows.length;
  } catch (error: any) {
    console.error(`❌ Erro ao copiar dados de ${tableName}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Iniciando migração direta Locaweb → Railway\n');
  
  try {
    // Listar todas as tabelas da Locaweb
    const tablesResult = await locawebPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`📋 ${tables.length} tabelas encontradas\n`);
    
    let totalRecords = 0;
    
    // Primeiro, remover todas as tabelas do Railway
    console.log('🗑️  Limpando Railway...');
    for (const table of tables) {
      await dropTableIfExists(table);
    }
    console.log('');
    
    // Copiar estrutura e dados
    console.log('📦 Copiando estrutura e dados...\n');
    for (const table of tables) {
      try {
        console.log(`\n🔄 Processando: ${table}`);
        
        // Obter estrutura
        const structure = await getTableStructure(table);
        
        // Criar tabela
        await createTableFromStructure(table, structure);
        
        // Copiar dados
        const count = await copyTableData(table);
        totalRecords += count;
        
      } catch (error: any) {
        console.error(`❌ Falha em ${table}:`, error.message);
      }
    }
    
    console.log('\n\n═══════════════════════════════════════');
    console.log(`✨ Migração concluída!`);
    console.log(`📊 Total: ${totalRecords} registros migrados`);
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
