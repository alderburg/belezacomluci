
-- Add modal_image_url column to coupons table
ALTER TABLE coupons ADD COLUMN modal_image_url TEXT;

-- Copy existing cover_image_url to modal_image_url for all records
UPDATE coupons SET modal_image_url = cover_image_url WHERE cover_image_url IS NOT NULL;
