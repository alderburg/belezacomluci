
-- Migration to add mobile background image field for community page
ALTER TABLE users ADD COLUMN IF NOT EXISTS community_background_image_mobile TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.community_background_image_mobile IS 'Mobile background image for community page header';
