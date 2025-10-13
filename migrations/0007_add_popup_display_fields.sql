
-- Add missing display control fields to popups table
ALTER TABLE "popups" ADD COLUMN IF NOT EXISTS "show_title" boolean DEFAULT true;
ALTER TABLE "popups" ADD COLUMN IF NOT EXISTS "show_description" boolean DEFAULT true;
ALTER TABLE "popups" ADD COLUMN IF NOT EXISTS "show_button" boolean DEFAULT true;
