
-- Criar tabelas para sistema de curtidas e compartilhamentos de posts

-- Tabela para armazenar curtidas de posts
CREATE TABLE IF NOT EXISTS post_likes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id varchar NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Tabela para armazenar compartilhamentos de posts
CREATE TABLE IF NOT EXISTS post_shares (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id varchar NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  platform varchar DEFAULT 'web',
  created_at timestamp DEFAULT now()
);

-- Tabela para armazenar visualizações de posts
CREATE TABLE IF NOT EXISTS post_views (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar REFERENCES users(id) ON DELETE CASCADE,
  post_id varchar NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  ip_address varchar,
  user_agent text,
  created_at timestamp DEFAULT now()
);

-- Adicionar coluna shares se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='posts' AND column_name='shares') THEN
        ALTER TABLE posts ADD COLUMN shares integer DEFAULT 0;
    END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_created_at ON post_likes(created_at);

CREATE INDEX IF NOT EXISTS idx_post_shares_user_id ON post_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_post_id ON post_shares(post_id);
CREATE INDEX IF NOT EXISTS idx_post_shares_created_at ON post_shares(created_at);

CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_created_at ON post_views(created_at);

-- Função para atualizar contador de curtidas automaticamente
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes = likes - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador de curtidas
DROP TRIGGER IF EXISTS trigger_update_post_likes_count ON post_likes;
CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- Função para sincronizar contadores existentes
DO $$
DECLARE
    post_record RECORD;
    actual_likes_count INTEGER;
BEGIN
    FOR post_record IN SELECT id FROM posts LOOP
        SELECT COUNT(*) INTO actual_likes_count 
        FROM post_likes 
        WHERE post_id = post_record.id;
        
        UPDATE posts 
        SET likes = actual_likes_count 
        WHERE id = post_record.id;
    END LOOP;
END $$;

-- Verificação das tabelas criadas
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICAÇÃO DAS TABELAS CRIADAS ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE '✓ Tabela users: OK';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts') THEN
        RAISE NOTICE '✓ Tabela posts: OK';
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='posts' AND column_name='shares') THEN
            RAISE NOTICE '  ✓ Coluna shares: OK';
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_likes') THEN
        RAISE NOTICE '✓ Tabela post_likes: OK';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_shares') THEN
        RAISE NOTICE '✓ Tabela post_shares: OK';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_views') THEN
        RAISE NOTICE '✓ Tabela post_views: OK';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
        RAISE NOTICE '✓ Tabela comments: OK';
    END IF;
    
    RAISE NOTICE '=== FIM DA VERIFICAÇÃO ===';
    RAISE NOTICE 'Script executado com sucesso! A página de comunidade está pronta.';
END $$;
