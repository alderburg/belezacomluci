
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixCommentInteractions() {
  console.log('🔧 Corrigindo interações de comentários...');

  try {
    // Criar tabela comment_likes se não existir
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_id varchar NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        created_at timestamp DEFAULT now(),
        UNIQUE(user_id, comment_id)
      )
    `);
    console.log('✅ Tabela comment_likes criada/verificada');

    // Criar tabela comment_replies se não existir
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS comment_replies (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id varchar NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content text NOT NULL,
        created_at timestamp DEFAULT now()
      )
    `);
    console.log('✅ Tabela comment_replies criada/verificada');

    // Remover colunas antigas se existirem
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'likes_count') THEN
          ALTER TABLE comments DROP COLUMN likes_count;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'comments' AND column_name = 'replies_count') THEN
          ALTER TABLE comments DROP COLUMN replies_count;
        END IF;
      END $$
    `);
    console.log('✅ Colunas antigas removidas (se existiam)');

    // Adicionar novas colunas
    await db.execute(sql`ALTER TABLE comments ADD COLUMN likes_count integer DEFAULT 0`);
    await db.execute(sql`ALTER TABLE comments ADD COLUMN replies_count integer DEFAULT 0`);
    console.log('✅ Colunas likes_count e replies_count adicionadas');

    // Criar índices
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON comment_likes(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON comment_likes(comment_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_comment_likes_created_at ON comment_likes(created_at)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON comment_replies(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_comment_replies_created_at ON comment_replies(created_at)`);
    console.log('✅ Índices criados');

    // Criar funções e triggers
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_comment_likes_count()
      RETURNS TRIGGER AS $$
      BEGIN
          IF TG_OP = 'INSERT' THEN
              UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
              RETURN NEW;
          ELSIF TG_OP = 'DELETE' THEN
              UPDATE comments SET likes_count = likes_count - 1 WHERE id = OLD.comment_id;
              RETURN OLD;
          END IF;
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.execute(sql`
      DROP TRIGGER IF EXISTS trigger_update_comment_likes_count ON comment_likes
    `);

    await db.execute(sql`
      CREATE TRIGGER trigger_update_comment_likes_count
          AFTER INSERT OR DELETE ON comment_likes
          FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count()
    `);
    console.log('✅ Trigger de curtidas criado');

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_comment_replies_count()
      RETURNS TRIGGER AS $$
      BEGIN
          IF TG_OP = 'INSERT' THEN
              UPDATE comments SET replies_count = replies_count + 1 WHERE id = NEW.comment_id;
              RETURN NEW;
          ELSIF TG_OP = 'DELETE' THEN
              UPDATE comments SET replies_count = replies_count - 1 WHERE id = OLD.comment_id;
              RETURN OLD;
          END IF;
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.execute(sql`
      DROP TRIGGER IF EXISTS trigger_update_comment_replies_count ON comment_replies
    `);

    await db.execute(sql`
      CREATE TRIGGER trigger_update_comment_replies_count
          AFTER INSERT OR DELETE ON comment_replies
          FOR EACH ROW EXECUTE FUNCTION update_comment_replies_count()
    `);
    console.log('✅ Trigger de respostas criado');

    console.log('✨ Interações de comentários corrigidas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao corrigir interações:', error);
    process.exit(1);
  }
}

fixCommentInteractions();
