import { hashPassword } from '../server/auth';

async function generateHash() {
  const password = 'Admin@123';
  const hash = await hashPassword(password);
  console.log('\n=== Script SQL para PostgreSQL ===\n');
  console.log(`UPDATE users SET password = '${hash}' WHERE email = 'admin@belezacomluci.com';\n`);
  console.log('=== Copie e execute este comando no seu PostgreSQL ===\n');
}

generateHash();
