
-- Migration to add display options to banners table
ALTER TABLE banners 
ADD COLUMN show_title boolean NOT NULL DEFAULT true,
ADD COLUMN show_description boolean NOT NULL DEFAULT true,
ADD COLUMN show_button boolean NOT NULL DEFAULT true;
