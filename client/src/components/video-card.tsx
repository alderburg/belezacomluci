import { Video } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Eye, Clock, Heart } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useYouTubeStats } from "@/hooks/use-youtube-stats";
import { useAdmin } from "@/contexts/admin-context";
import { useAuth } from "@/hooks/use-auth";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { useState } from "react";

interface VideoCardProps {
  video: Video;
  viewMode?: 'premium' | 'free';
}

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'makeup':
      return 'Maquiagem';
    case 'skincare':
      return 'Skincare';
    case 'hair':
      return 'Cabelos';
    case 'nails':
      return 'Unhas';
    default:
      return category;
  }
};

const getButtonLabel = (type: string) => {
  switch (type) {
    case 'video':
      return 'Assistir Vídeo';
    case 'playlist':
      return 'Assistir Playlist';
    case 'live':
      return 'Ao Vivo';
    default:
      return 'Assistir Vídeo';
  }
};

export default function VideoCard({ video, viewMode: propViewMode }: VideoCardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const youtubeStats = useYouTubeStats(video.videoUrl);
  const { viewMode: adminViewMode } = useAdmin();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  
  // For admins, always use admin view mode; for others, use prop or default to premium
  const effectiveViewMode = (user?.isAdmin ? adminViewMode : propViewMode) || 'premium';

  const handleWatchVideo = () => {
    // Se for playlist, navega para a página de playlist
    if (video.type === 'playlist') {
      navigate(`/playlist/${video.id}`);
    } else {
      // Para vídeos normais e live, navega para a página de vídeo
      navigate(`/video/${video.id}`);
    }
  };

  const handlePremiumClick = () => {
    setShowPremiumModal(true);
  };

  const formatDuration = (duration: string | number) => {
    // Se for string (formato HH:MM:SS), exibir diretamente
    if (typeof duration === 'string' && duration.includes(':')) {
      return duration;
    }
    
    // Se for número (minutos decimais), converter para HH:MM:SS
    if (typeof duration === 'number') {
      const totalSeconds = Math.round(duration * 60);
      const hours = Math.floor(totalSeconds / 3600);
      const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return '00:00:00';
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-[380px] flex flex-col" data-testid={`video-card-${video.id}`}>
      <div className="relative">
        <div
          className="w-full h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center bg-cover bg-center"
          style={video.thumbnailUrl ? { backgroundImage: `url(${video.thumbnailUrl})` } : {}}
        >
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-primary ml-1" />
            </div>
          </div>
          
          {/* Bolinha vermelha "AO VIVO" no canto superior direito */}
          {video.type === 'live' && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              AO VIVO
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {video.category && (
              <Badge variant="outline" className="text-xs">
                {getCategoryLabel(video.category)}
              </Badge>
            )}
            {video.isExclusive ? (
              <Badge className="bg-purple-100 text-purple-700">Exclusivo</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-700">Gratuito</Badge>
            )}
          </div>
          {video.duration && (
            <span className="text-xs text-muted-foreground flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              {video.duration}
            </span>
          )}
        </div>

        <h4 className="font-semibold text-foreground mb-2 line-clamp-2" data-testid={`video-title-${video.id}`}>
          {video.title}
        </h4>

        {video.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {video.description}
          </p>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span data-testid={`video-views-${video.id}`}>
                {youtubeStats.loading ? 'Carregando...' : `${youtubeStats.views.toLocaleString()} visualizações`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span data-testid={`video-likes-${video.id}`}>
                {youtubeStats.loading ? 'Carregando...' : `${youtubeStats.likes.toLocaleString()} curtidas`}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-3">
          {effectiveViewMode === 'free' && video.isExclusive ? (
            <Button
              size="sm"
              onClick={handlePremiumClick}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] animate-[gradient-shift_2s_ease-in-out_infinite] text-white font-semibold hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 cursor-pointer"
              data-testid={`button-premium-${video.id}`}
            >
              Exclusivo para membros Premium
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleWatchVideo}
              className={`w-full ${
                video.type === 'live' 
                  ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] animate-[gradient-shift_2s_ease-in-out_infinite] text-white font-semibold hover:from-purple-600 hover:via-pink-600 hover:to-purple-600'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
              data-testid={`button-watch-video-${video.id}`}
            >
              {getButtonLabel(video.type || 'video')}
            </Button>
          )}
        </div>
      </CardContent>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        contentType="video"
        contentTitle={video.title}
      />
    </Card>
  );
}