
-- Adiciona coluna modal_image_url à tabela coupons
ALTER TABLE coupons 
ADD COLUMN IF NOT EXISTS modal_image_url TEXT;

-- Copia os valores de cover_image_url para modal_image_url onde estiver vazio
UPDATE coupons 
SET modal_image_url = cover_image_url 
WHERE modal_image_url IS NULL;
