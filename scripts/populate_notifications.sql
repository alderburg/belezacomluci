-- Script para popular o banco com 10 tipos de notificações para "Beleza com Luci"
-- Execute este script no seu banco de dados PostgreSQL

INSERT INTO notifications (
    title, 
    content, 
    type, 
    category, 
    priority, 
    icon, 
    color, 
    target_audience, 
    status, 
    is_active,
    can_send_manually,
    max_sends_per_day,
    min_interval_hours
) VALUES 

-- 1. Notificação de Boas-vindas
(
    'Bem-vinda ao Beleza com Luci! 💄',
    'Olá linda! Seja muito bem-vinda à nossa comunidade de beleza. Explore nossos conteúdos exclusivos, produtos digitais e cupons especiais. Vamos juntas nessa jornada de autocuidado!',
    'manual',
    'system',
    'high',
    'heart',
    '#ff6b9d',
    'all',
    'sent',
    true,
    true,
    2,
    12
),

-- 2. Novo Vídeo Exclusivo
(
    '🎥 Novo vídeo: Tutorial de Maquiagem para o Dia',
    'Um novo tutorial exclusivo está disponível! Aprenda técnicas profissionais de maquiagem para arrasar no dia a dia. Assista agora e deixe sua beleza ainda mais radiante!',
    'new_video',
    'promotional',
    'normal',
    'video',
    '#9333ea',
    'premium',
    'sent',
    true,
    true,
    1,
    6
),

-- 3. Cupom de Desconto
(
    '🏷️ Cupom Especial: 25% OFF em Skincare',
    'Suas lindas! Temos um cupom exclusivo de 25% de desconto em produtos de skincare da marca XYZ. Use o código PELE25 e cuide da sua pele com desconto especial!',
    'new_coupon',
    'promotional',
    'high',
    'tag',
    '#10b981',
    'all',
    'sent',
    true,
    true,
    1,
    24
),

-- 4. Produto Digital Lançado
(
    '📚 Novo E-book: Guia Completo de Cuidados com a Pele',
    'Acabamos de lançar nosso e-book exclusivo com tudo sobre skincare! Rotinas para cada tipo de pele, dicas de profissionais e muito mais. Baixe agora gratuitamente!',
    'new_product',
    'achievements',
    'normal',
    'gift',
    '#f59e0b',
    'premium',
    'sent',
    true,
    true,
    1,
    48
),

-- 5. Missão Concluída
(
    '🏆 Parabéns! Você completou a missão "Beleza Natural"',
    'Incrível! Você assistiu a todos os vídeos sobre beleza natural e ganhou 50 pontos. Continue explorando nossos conteúdos e desbloqueie mais recompensas!',
    'mission_completed',
    'achievements',
    'normal',
    'trophy',
    '#8b5cf6',
    'specific',
    'sent',
    true,
    false,
    5,
    1
),

-- 6. Lembrete de Rotina
(
    '⏰ Hora da sua rotina de skincare noturna',
    'Oi querida! É hora de cuidar da sua pele antes de dormir. Lembre-se: demaquilante, tônico, sérum e hidratante. Sua pele vai agradecer amanhã!',
    'scheduled',
    'reminders',
    'low',
    'bell',
    '#06b6d4',
    'all',
    'scheduled',
    true,
    true,
    1,
    23
),

-- 7. Sorteio Especial
(
    '🎁 Participar do Sorteio: Kit Completo de Maquiagem',
    'Estamos sorteando um kit completo de maquiagem profissional! Para participar, assista a 3 vídeos desta semana e deixe seu comentário. Boa sorte, lindas!',
    'new_raffle',
    'promotional',
    'high',
    'gift',
    '#dc2626',
    'all',
    'sent',
    true,
    true,
    1,
    72
),

-- 8. Dica Rápida Diária
(
    '💡 Dica do Dia: Hidratação é tudo!',
    'Dica da Luci para hoje: beba pelo menos 2 litros de água por dia! A hidratação reflete diretamente na sua pele, deixando-a mais bonita e saudável. #DicaDaLuci',
    'manual',
    'general',
    'low',
    'star',
    '#0ea5e9',
    'all',
    'sent',
    true,
    true,
    1,
    24
),

-- 9. Evento Especial
(
    '🌟 Live Especial: Tendências de Maquiagem 2024',
    'Não perca nossa live especial sobre as tendências de maquiagem para 2024! Vamos falar sobre cores, técnicas e produtos que serão hit no próximo ano. Hoje às 20h!',
    'manual',
    'promotional',
    'urgent',
    'video',
    '#ec4899',
    'all',
    'scheduled',
    true,
    true,
    2,
    4
),

-- 10. Progresso de Aprendizado
(
    '📈 Você está evoluindo! 80% dos vídeos assistidos',
    'Que orgulho! Você já assistiu 80% dos nossos vídeos de skincare básico. Continue assim e logo será uma expert em cuidados com a pele. Faltam apenas 2 vídeos!',
    'mission_progress',
    'achievements',
    'normal',
    'trophy',
    '#84cc16',
    'specific',
    'sent',
    true,
    false,
    3,
    2
);

-- Inserir algumas leituras simuladas para demonstrar as estatísticas
-- (apenas se você quiser mostrar dados nas estatísticas)

-- Atualizar contadores de estatísticas das notificações
UPDATE notifications SET 
    total_sent_count = FLOOR(RANDOM() * 100) + 10,
    total_read_count = FLOOR(RANDOM() * 80) + 5,
    total_click_count = FLOOR(RANDOM() * 30) + 1,
    target_user_count = FLOOR(RANDOM() * 50) + 5
WHERE title LIKE '%Bem-vinda%' OR title LIKE '%Novo vídeo%' OR title LIKE '%Cupom%';

-- Verificar os dados inseridos
SELECT 
    title,
    type,
    category,
    priority,
    status,
    target_audience,
    icon,
    total_sent_count,
    total_read_count,
    created_at
FROM notifications 
ORDER BY created_at DESC
LIMIT 10;