-- Tabela para armazenar pessoas marcadas em posts
CREATE TABLE IF NOT EXISTS "post_tags" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" varchar NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
  "tagged_user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now()
);

-- Índices para melhorar a performance
CREATE INDEX IF NOT EXISTS "idx_post_tags_post_id" ON "post_tags" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_post_tags_tagged_user_id" ON "post_tags" ("tagged_user_id");
