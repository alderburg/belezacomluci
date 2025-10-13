import { useState, useEffect } from 'react';

interface YouTubeStats {
  views: number;
  likes: number;
  loading: boolean;
  error: string | null;
}

// Extract YouTube video ID from URL
const extractYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#\?]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
    /(?:youtube\.com\/v\/)([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      // Remove any trailing parameters from the video ID
      let videoId = match[1];
      if (videoId.includes('?')) {
        videoId = videoId.split('?')[0];
      }
      return videoId;
    }
  }
  return null;
};

export const useYouTubeStats = (videoUrl: string): YouTubeStats => {
  const [stats, setStats] = useState<YouTubeStats>({
    views: 0,
    likes: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchStats = async () => {
      const videoId = extractYouTubeVideoId(videoUrl);
      if (!videoId) {
        setStats({
          views: 0,
          likes: 0,
          loading: false,
          error: 'Invalid YouTube URL'
        });
        return;
      }

      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));
        
        const response = await fetch(`/api/youtube/video/${videoId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch video stats');
        }

        const data = await response.json();
        setStats({
          views: data.views || 0,
          likes: data.likes || 0,
          loading: false,
          error: null
        });
      } catch (error) {
        setStats({
          views: 0,
          likes: 0,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    if (videoUrl) {
      fetchStats();
    }
  }, [videoUrl]);

  return stats;
};