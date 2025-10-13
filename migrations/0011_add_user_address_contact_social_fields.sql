-- Migration to add address, contact, and social network fields to users table

-- Add contact fields
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN phone_type TEXT;

-- Add address fields
ALTER TABLE users ADD COLUMN zip_code TEXT;
ALTER TABLE users ADD COLUMN street TEXT;
ALTER TABLE users ADD COLUMN number TEXT;
ALTER TABLE users ADD COLUMN complement TEXT;
ALTER TABLE users ADD COLUMN neighborhood TEXT;
ALTER TABLE users ADD COLUMN city TEXT;
ALTER TABLE users ADD COLUMN state TEXT;

-- Add social networks field (JSON array)
ALTER TABLE users ADD COLUMN social_networks JSON DEFAULT '[]';