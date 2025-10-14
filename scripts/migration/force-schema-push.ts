import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function pushSchema() {
  console.log('🚀 Aplicando schema ao Railway com força...\n');
  
  try {
    const { stdout, stderr } = await execAsync('npm run db:push -- --force', {
      env: { ...process.env, FORCE: 'true' }
    });
    
    console.log(stdout);
    if (stderr && !stderr.includes('deprecated')) {
      console.error(stderr);
    }
    
    console.log('\n✅ Schema aplicado com sucesso!');
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
  }
}

pushSchema();
