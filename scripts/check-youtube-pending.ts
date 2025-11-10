
import { db } from '../server/db';
import { videos } from '../shared/schema';
import { youtubeService } from '../server/youtube-service';
import { eq } from 'drizzle-orm';

async function checkPendingVideos() {
  try {
    console.log('🔍 Verificando vídeos pendentes do YouTube...\n');

    // Buscar o channel ID das configurações
    const { getYoutubeChannelId } = await import('../server/lib/apiSettings');
    const channelId = await getYoutubeChannelId();
    
    if (!channelId) {
      console.log('❌ Channel ID não configurado');
      return;
    }

    console.log(`📺 Channel ID: ${channelId}\n`);

    // Buscar todos os vídeos do YouTube
    console.log('⏳ Buscando vídeos do YouTube...');
    const youtubeVideos = await youtubeService.getAllChannelVideos(channelId, 500);
    console.log(`✅ Total de vídeos no canal: ${youtubeVideos.length}\n`);

    // Buscar vídeos já cadastrados no sistema
    const existingVideos = await db.select().from(videos);
    console.log(`📚 Vídeos cadastrados no sistema: ${existingVideos.length}\n`);

    // Extrair IDs dos vídeos existentes
    const existingVideoIds = new Set(
      existingVideos
        .map(v => {
          if (!v.videoUrl) return null;
          
          // Extrair ID do YouTube da URL
          const patterns = [
            /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
            /(?:youtu\.be\/)([^&\n?#\?]+)/,
            /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
          ];
          
          for (const pattern of patterns) {
            const match = v.videoUrl.match(pattern);
            if (match && match[1]) {
              return match[1].split('?')[0];
            }
          }
          return null;
        })
        .filter(id => id !== null)
    );

    console.log(`🔑 IDs únicos cadastrados: ${existingVideoIds.size}\n`);

    // Filtrar vídeos novos
    const newVideos = youtubeVideos.filter(video => !existingVideoIds.has(video.id));

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🆕 VÍDEOS PENDENTES: ${newVideos.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (newVideos.length > 0) {
      console.log('📋 Lista de vídeos pendentes:\n');
      newVideos.forEach((video, index) => {
        console.log(`${index + 1}. ${video.title}`);
        console.log(`   ID: ${video.id}`);
        console.log(`   URL: https://youtu.be/${video.id}`);
        console.log(`   Duração: ${video.duration}`);
        console.log(`   Publicado em: ${new Date(video.publishedAt).toLocaleDateString('pt-BR')}\n`);
      });
    } else {
      console.log('✅ Todos os vídeos do canal já estão sincronizados!\n');
    }

    // Estatísticas
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ESTATÍSTICAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total no YouTube: ${youtubeVideos.length}`);
    console.log(`Já cadastrados: ${existingVideoIds.size}`);
    console.log(`Pendentes: ${newVideos.length}`);
    console.log(`Percentual sincronizado: ${((existingVideoIds.size / youtubeVideos.length) * 100).toFixed(1)}%`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro ao verificar vídeos pendentes:', error);
    throw error;
  }
}

checkPendingVideos()
  .then(() => {
    console.log('✅ Verificação concluída!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
