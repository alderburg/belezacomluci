
-- Create video_progress table to track user watch progress
CREATE TABLE IF NOT EXISTS video_progress (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  resource_id TEXT NOT NULL, -- ID do vídeo ou produto (para playlists)
  max_time_watched INTEGER NOT NULL DEFAULT 0, -- Tempo máximo assistido em segundos
  duration INTEGER, -- Duração total do vídeo em segundos
  progress_percentage INTEGER DEFAULT 0, -- Porcentagem assistida (0-100)
  is_completed BOOLEAN DEFAULT false, -- Se assistiu mais de 90%
  last_watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_id, resource_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_resource_id ON video_progress(resource_id);
