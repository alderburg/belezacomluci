import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../server/auth';
import dotenv from 'dotenv';

dotenv.config();

async function resetAdminPassword() {
  try {
    console.log('🔐 Resetando senha do admin...');
    
    // Buscar usuário admin (selecionar apenas colunas necessárias)
    const [admin] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name
      })
      .from(users)
      .where(eq(users.email, 'admin@belezacomluci.com'))
      .limit(1);
    
    if (!admin) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    console.log('✅ Admin encontrado:', admin.email);
    
    // Criar nova senha criptografada
    const newPassword = await hashPassword('Admin@123');
    console.log('🔒 Nova senha criptografada gerada');
    
    // Atualizar senha
    await db
      .update(users)
      .set({ password: newPassword })
      .where(eq(users.email, 'admin@belezacomluci.com'));
    
    console.log('✅ Senha atualizada com sucesso!');
    console.log('📧 Email: admin@belezacomluci.com');
    console.log('🔑 Senha: Admin@123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    process.exit(1);
  }
}

resetAdminPassword();
