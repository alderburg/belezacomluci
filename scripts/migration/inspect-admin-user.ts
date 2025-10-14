
import * as fs from 'fs';
import * as path from 'path';

const backupDir = path.join(process.cwd(), 'scripts/migration/backup');

async function inspectAdminUser() {
  console.log('🔍 Inspecionando dados do usuário admin...\n');
  
  const usersFile = path.join(backupDir, 'users.json');
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  
  const admin = users.find((u: any) => u.username === 'admin');
  
  if (!admin) {
    console.log('❌ Usuário admin não encontrado no backup');
    return;
  }
  
  console.log('📋 Dados do Admin:');
  console.log(JSON.stringify(admin, null, 2));
  
  console.log('\n🔍 Verificando campo social_media_links:');
  console.log('Tipo:', typeof admin.social_media_links);
  console.log('Valor:', admin.social_media_links);
  
  // Tentar corrigir
  if (admin.social_media_links) {
    console.log('\n🔧 Tentando corrigir...');
    
    let fixed = { ...admin };
    
    if (typeof admin.social_media_links === 'string') {
      try {
        // Tentar parse direto
        fixed.social_media_links = JSON.parse(admin.social_media_links);
        console.log('✅ Parse bem-sucedido:', fixed.social_media_links);
      } catch (e) {
        console.log('⚠️  Parse falhou, limpando campo');
        fixed.social_media_links = null;
      }
    }
    
    // Salvar versão corrigida
    const usersFixed = users.map((u: any) => 
      u.username === 'admin' ? fixed : u
    );
    
    const fixedFile = path.join(backupDir, 'users-fixed.json');
    fs.writeFileSync(fixedFile, JSON.stringify(usersFixed, null, 2));
    console.log('\n✅ Arquivo corrigido salvo em:', fixedFile);
  }
}

inspectAdminUser().catch(console.error);
