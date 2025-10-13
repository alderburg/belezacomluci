import sharp from 'sharp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function convertToWebP() {
  const inputPath = path.resolve(__dirname, '../client/public/images/luci-profile.png');
  const outputPath = path.resolve(__dirname, '../client/public/images/luci-profile.webp');
  
  try {
    const info = await sharp(inputPath)
      .webp({ 
        quality: 85,
        effort: 6
      })
      .toFile(outputPath);
    
    console.log(`✅ Conversão completa!`);
    console.log(`   Tamanho: ${Math.round(info.size / 1024)}KB`);
    console.log(`   Dimensões: ${info.width}x${info.height}`);
  } catch (error) {
    console.error('❌ Erro na conversão:', error);
  }
}

convertToWebP();
