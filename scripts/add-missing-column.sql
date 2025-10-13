-- Script para adicionar coluna faltante no banco da Locaweb
-- Execute este script diretamente no PostgreSQL

-- Adicionar coluna community_background_image_mobile se não existir
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS community_background_image_mobile TEXT;

-- Verificar se a coluna phoneType existe, se não, adicionar
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_type TEXT;

-- Verificar resultado
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('community_background_image_mobile', 'phone_type')
ORDER BY column_name;
