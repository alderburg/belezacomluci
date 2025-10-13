
-- Script para popular o banco com notificações para "Beleza com Luci"
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
    min_interval_hours,
    total_sent_count,
    total_read_count,
    total_click_count
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
    12,
    45,
    38,
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
    3,
    6,
    28,
    22,
    8
),

-- 3. Cupom Especial
(
    '🏷️ Cupom exclusivo: 30% OFF na Sephora!',
    'Aproveite nosso cupom especial com 30% de desconto na Sephora! Válido apenas para assinantes premium. Use o código: LUCI30OFF. Corre que é por tempo limitado!',
    'new_coupon',
    'promotional',
    'high',
    'gift',
    '#10b981',
    'premium',
    'sent',
    true,
    true,
    2,
    8,
    15,
    12,
    9
),

-- 4. Lembrete de Produto
(
    '📚 Não esqueça do seu E-book de Skincare!',
    'Você baixou nosso e-book "Rotina de Skincare Completa" mas ainda não conferiu? Não perca tempo e comece hoje mesmo sua jornada para uma pele perfeita!',
    'manual',
    'reminders',
    'normal',
    'bell',
    '#f59e0b',
    'all',
    'sent',
    true,
    true,
    1,
    24,
    32,
    18,
    5
),

-- 5. Conquista Desbloqueada
(
    '🏆 Parabéns! Você desbloqueou a conquista "Expert em Maquiagem"',
    'Que incrível! Você assistiu a todos os tutoriais de maquiagem e conquistou o título de Expert! Continue assim e descubra novos desafios na sua jornada de beleza.',
    'mission_completed',
    'achievements',
    'high',
    'trophy',
    '#fbbf24',
    'all',
    'sent',
    true,
    false,
    5,
    1,
    8,
    8,
    3
),

-- 6. Novo Produto Digital
(
    '📱 Checklist de Maquiagem para Casamento disponível!',
    'Novo produto na nossa loja! Um checklist completo com tudo que você precisa saber para fazer uma maquiagem perfeita para casamentos. Acesse agora na seção Produtos!',
    'new_product',
    'promotional',
    'normal',
    'shopping',
    '#8b5cf6',
    'all',
    'sent',
    true,
    true,
    2,
    12,
    25,
    19,
    11
),

-- 7. Dica Semanal
(
    '💡 Dica da Semana: Hidratação é a chave para uma pele radiante',
    'A dica desta semana é sobre hidratação! Sabia que uma pele bem hidratada é a base para qualquer maquiagem? Confira nossas dicas de hidratação no novo vídeo da semana.',
    'manual',
    'general',
    'normal',
    'star',
    '#06b6d4',
    'all',
    'sent',
    true,
    true,
    1,
    168,
    42,
    35,
    7
),

-- 8. Lembrete de Comunidade
(
    '👥 Sua comunidade te espera! Compartilhe suas dúvidas',
    'Que tal interagir com outras cheirosas? Nossa comunidade está cheia de dicas incríveis e pessoas dispostas a ajudar. Compartilhe suas experiências e aprenda ainda mais!',
    'manual',
    'general',
    'low',
    'heart',
    '#ec4899',
    'all',
    'scheduled',
    true,
    true,
    2,
    4,
    18,
    14,
    6
),

-- 9. Promoção Especial
(
    '🎉 Black Friday da Beleza: Até 50% OFF em produtos selecionados!',
    'A Black Friday chegou na Beleza com Luci! Aproveite descontos incríveis de até 50% em produtos de beleza das melhores marcas. Confira nossos cupons exclusivos!',
    'manual',
    'promotional',
    'urgent',
    'gift',
    '#dc2626',
    'all',
    'sent',
    true,
    true,
    5,
    2,
    67,
    54,
    23
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
    2,
    12,
    9,
    4
);
