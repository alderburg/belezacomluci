-- Add shares column to posts table
ALTER TABLE posts ADD COLUMN shares integer DEFAULT 0;

-- Create post_likes table
CREATE TABLE post_likes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id),
  post_id varchar NOT NULL REFERENCES posts(id),
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Add indexes for better performance
CREATE INDEX idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX idx_post_likes_created_at ON post_likes(created_at);