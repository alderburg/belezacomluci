
-- Criar tabela para curtidas em comentários
CREATE TABLE IF NOT EXISTS comment_likes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id varchar NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, comment_id)
);

-- Criar tabela para respostas de comentários
CREATE TABLE IF NOT EXISTS comment_replies (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id varchar NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Adicionar colunas de contadores aos comentários
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON comment_likes(created_at);

CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON comment_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_created_at ON comment_replies(created_at);

-- Função para atualizar contador de curtidas em comentários
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments SET likes = likes + 1 WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments SET likes = likes - 1 WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador de curtidas
DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes;
CREATE TRIGGER trigger_update_comment_likes_count
    AFTER INSERT OR DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Função para atualizar contador de respostas
CREATE OR REPLACE FUNCTION update_comment_replies_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments SET reply_count = reply_count + 1 WHERE id = NEW.comment_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments SET reply_count = reply_count - 1 WHERE id = OLD.comment_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar contador de respostas
DROP TRIGGER IF EXISTS trigger_update_comment_replies_count ON comment_replies;
CREATE TRIGGER trigger_update_comment_replies_count
    AFTER INSERT OR DELETE ON comment_replies
    FOR EACH ROW EXECUTE FUNCTION update_comment_replies_count();
