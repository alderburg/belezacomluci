
-- Migration para adicionar campos avançados às missões

ALTER TABLE missions ADD COLUMN IF NOT EXISTS min_level VARCHAR DEFAULT 'bronze' CHECK (min_level IN ('bronze', 'silver', 'gold', 'diamond'));
ALTER TABLE missions ADD COLUMN IF NOT EXISTS min_points INTEGER DEFAULT 0;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS premium_only BOOLEAN DEFAULT false;
ALTER TABLE missions ADD COLUMN IF NOT EXISTS usage_limit INTEGER DEFAULT 0; -- 0 = unlimited

-- Comentário explicativo
COMMENT ON COLUMN missions.min_level IS 'Nível mínimo do usuário para acessar esta missão';
COMMENT ON COLUMN missions.min_points IS 'Pontos mínimos necessários para acessar esta missão';
COMMENT ON COLUMN missions.premium_only IS 'Se true, apenas usuários premium podem acessar';
COMMENT ON COLUMN missions.usage_limit IS 'Quantas vezes pode ser completada (0 = ilimitado)';
