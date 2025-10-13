-- Migration para criar sistema de gamificação "Minhas Cheirosas"

-- Tabela de pontos dos usuários
CREATE TABLE IF NOT EXISTS user_points (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  total_points INTEGER DEFAULT 0,
  current_level VARCHAR DEFAULT 'bronze' CHECK (current_level IN ('bronze', 'silver', 'gold', 'diamond')),
  level_progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Tabela de missões disponíveis
CREATE TABLE IF NOT EXISTS missions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_reward INTEGER NOT NULL,
  mission_type VARCHAR NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'monthly', 'achievement')),
  action_required VARCHAR NOT NULL, -- 'watch_video', 'comment', 'share', 'invite_friend', 'download_product', 'use_coupon'
  target_count INTEGER DEFAULT 1,
  icon VARCHAR DEFAULT 'star',
  color VARCHAR DEFAULT '#ff6b9d',
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP DEFAULT now(),
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de progresso das missões dos usuários
CREATE TABLE IF NOT EXISTS user_missions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  mission_id VARCHAR NOT NULL REFERENCES missions(id),
  current_progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de recompensas disponíveis
CREATE TABLE IF NOT EXISTS rewards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  reward_type VARCHAR NOT NULL CHECK (reward_type IN ('coupon', 'sample', 'exclusive_video', 'badge', 'custom')),
  reward_value TEXT, -- JSON com dados específicos da recompensa
  image_url TEXT,
  stock_quantity INTEGER DEFAULT -1, -- -1 para ilimitado
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de recompensas resgatadas pelos usuários
CREATE TABLE IF NOT EXISTS user_rewards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  reward_id VARCHAR NOT NULL REFERENCES rewards(id),
  points_spent INTEGER NOT NULL,
  status VARCHAR DEFAULT 'claimed' CHECK (status IN ('claimed', 'delivered', 'expired')),
  reward_data TEXT, -- JSON com dados específicos do resgate
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de sorteios
CREATE TABLE IF NOT EXISTS raffles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prize_description TEXT NOT NULL,
  image_url TEXT,
  entry_cost INTEGER DEFAULT 1, -- quantos pontos custa cada participação
  max_entries_per_user INTEGER DEFAULT 10,
  start_date TIMESTAMP DEFAULT now(),
  end_date TIMESTAMP NOT NULL,
  winner_user_id VARCHAR REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  total_entries INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de participações em sorteios
CREATE TABLE IF NOT EXISTS raffle_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  raffle_id VARCHAR NOT NULL REFERENCES raffles(id),
  entry_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de conquistas/badges
CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR DEFAULT 'trophy',
  color VARCHAR DEFAULT '#ffd700',
  condition_type VARCHAR NOT NULL, -- 'points_total', 'level_reached', 'missions_completed', 'videos_watched', etc.
  condition_value INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

-- Tabela de conquistas desbloqueadas pelos usuários
CREATE TABLE IF NOT EXISTS user_achievements (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  achievement_id VARCHAR NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMP DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_mission_id ON user_missions(mission_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_user_id ON raffle_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_raffle_id ON raffle_entries(raffle_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Função para calcular nível baseado nos pontos
CREATE OR REPLACE FUNCTION calculate_user_level(points INTEGER)
RETURNS TABLE(level VARCHAR, progress INTEGER, next_level_points INTEGER) AS $$
BEGIN
  IF points < 100 THEN
    RETURN QUERY SELECT 'bronze'::VARCHAR, points, 100;
  ELSIF points < 500 THEN
    RETURN QUERY SELECT 'silver'::VARCHAR, points - 100, 500;
  ELSIF points < 1500 THEN
    RETURN QUERY SELECT 'gold'::VARCHAR, points - 500, 1500;
  ELSE
    RETURN QUERY SELECT 'diamond'::VARCHAR, points - 1500, 99999;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar automaticamente o nível quando pontos mudam
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
DECLARE
  level_data RECORD;
BEGIN
  -- Calcular novo nível
  SELECT * INTO level_data FROM calculate_user_level(NEW.total_points);
  
  -- Atualizar nível e progresso
  NEW.current_level := level_data.level;
  NEW.level_progress := level_data.progress;
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE OF total_points ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();

-- Inserir usuários na tabela user_points se ainda não existirem
INSERT INTO user_points (user_id, total_points)
SELECT id, 0 FROM users 
WHERE id NOT IN (SELECT user_id FROM user_points);

-- Inserir missões padrão
INSERT INTO missions (title, description, points_reward, mission_type, action_required, target_count, icon, color) VALUES
('Primeira Visualização', 'Assista seu primeiro vídeo completo', 10, 'achievement', 'watch_video', 1, 'play', '#ff6b9d'),
('Comentarista Ativa', 'Deixe 3 comentários em conteúdos', 15, 'weekly', 'comment', 3, 'message-circle', '#9c5ff5'),
('Cupom Hunter', 'Use um cupom de desconto', 20, 'weekly', 'use_coupon', 1, 'tag', '#ff9500'),
('Influencer Cheirosa', 'Convide uma amiga para a plataforma', 50, 'achievement', 'invite_friend', 1, 'user-plus', '#00d4ff'),
('Exploradora', 'Baixe 2 produtos gratuitos', 25, 'weekly', 'download_product', 2, 'download', '#7c3aed'),
('Maratona de Beleza', 'Assista 5 vídeos em uma semana', 35, 'weekly', 'watch_video', 5, 'zap', '#ff6b9d'),
('Comentários de Ouro', 'Receba 10 likes em seus comentários', 40, 'monthly', 'comment_likes', 10, 'heart', '#ffd700'),
('Cheirosa Fiel', 'Acesse a plataforma 7 dias seguidos', 60, 'monthly', 'daily_access', 7, 'calendar', '#00c896');

-- Inserir recompensas padrão
INSERT INTO rewards (title, description, points_cost, reward_type, reward_value, image_url) VALUES
('Amostra Premium', 'Receba uma amostra exclusiva de perfume', 50, 'sample', '{"type": "perfume_sample", "brands": ["Chanel", "Dior", "YSL"]}', '/uploads/reward-perfume.jpg'),
('Cupom 15% OFF', 'Desconto especial em produtos de beleza', 100, 'coupon', '{"discount": 15, "code": "CHEIROSA15"}', '/uploads/reward-coupon.jpg'),
('Vídeo VIP Exclusivo', 'Acesso a conteúdo premium por 30 dias', 150, 'exclusive_video', '{"access_days": 30}', '/uploads/reward-vip.jpg'),
('Kit Iniciante', 'Kit completo para iniciantes em skincare', 200, 'sample', '{"type": "skincare_kit", "products": 5}', '/uploads/reward-kit.jpg'),
('Badge Cheirosa Gold', 'Conquista especial no seu perfil', 80, 'badge', '{"badge": "cheirosa_gold", "icon": "crown"}', '/uploads/reward-badge.jpg'),
('Consultoria Personalizada', 'Sessão 1:1 com nossa especialista', 500, 'custom', '{"type": "consultation", "duration": 60}', '/uploads/reward-consultation.jpg');

-- Inserir conquistas padrão
INSERT INTO achievements (title, description, condition_type, condition_value, icon, color) VALUES
('Primeira Cheirosa', 'Bem-vinda ao mundo da beleza!', 'points_total', 10, 'sparkles', '#ff6b9d'),
('Cheirosa de Bronze', 'Alcance o nível Bronze', 'level_reached', 1, 'award', '#cd7f32'),
('Cheirosa de Prata', 'Alcance o nível Prata', 'level_reached', 2, 'award', '#c0c0c0'),
('Cheirosa de Ouro', 'Alcance o nível Ouro', 'level_reached', 3, 'award', '#ffd700'),
('Cheirosa Diamante', 'Alcance o nível Diamante', 'level_reached', 4, 'diamond', '#b9f2ff'),
('Desbravadora', 'Complete 10 missões', 'missions_completed', 10, 'compass', '#7c3aed'),
('Viciada em Conteúdo', 'Assista 50 vídeos', 'videos_watched', 50, 'eye', '#ff9500'),
('Milionária em Pontos', 'Acumule 1000 pontos', 'points_total', 1000, 'coins', '#ffd700');

-- Inserir sorteio de exemplo
INSERT INTO raffles (title, description, prize_description, entry_cost, max_entries_per_user, end_date, image_url) VALUES
('Sorteio Kit Completo de Beleza', 'Concorra a um kit incrível com os melhores produtos de skincare e makeup!', 'Kit com 10 produtos premium: base, corretivo, paleta de sombras, batons, skincare completo e mais!', 5, 20, NOW() + INTERVAL '30 days', '/uploads/raffle-kit.jpg'),
('Perfume Importado Exclusivo', 'Ganhe um perfume importado de marca premium', 'Perfume feminino 100ml de marcas como Chanel, Dior ou YSL', 3, 15, NOW() + INTERVAL '15 days', '/uploads/raffle-perfume.jpg');