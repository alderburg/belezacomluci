import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Video, Star, Search, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Video as VideoType } from "@shared/schema";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import VideoCard from "@/components/video-card";
import BannerCarousel from "@/components/banner-carousel";

export default function VideosExclusivosMobilePage() {
  
  const [location, setLocation] = useLocation();
  const [videoType, setVideoType] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Scroll para o topo quando a página carrega
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  const handleBackClick = () => {
    setLocation('/');
  };

  const { data: banners } = useQuery<any[]>({
    queryKey: ["/api/banners"],
  });

  const { data: videos, isLoading } = useQuery<VideoType[]>({
    queryKey: ["/api/videos"],
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "videos") || [];
  const hasActiveBanners = activeBanners.length > 0;

  const filteredVideos = videos?.filter((video) => {
    const matchesType = !videoType || videoType === "all" || video.type === videoType;
    const matchesCategory = !category || category === "all" || video.categoryId === category;
    const matchesSearch = !searchTerm ||
      video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesCategory && matchesSearch;
  }) || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Vídeos Exclusivos</h1>
            <p className="text-sm text-muted-foreground">Conteúdo premium e tutoriais especiais</p>
          </div>
          <Play className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Banner */}
      <div className="pt-16 w-full">
        {hasActiveBanners && <BannerCarousel page="videos" />}
      </div>

      {/* Content Section */}
      <div className={`px-4 py-6 ${!hasActiveBanners ? 'pt-20' : ''}`}>
        

        {/* Filtros */}
        <div className="mb-6">
          {/* Linha principal com pesquisa e filtros */}
          <div className="flex gap-2 mb-4">
            {/* Campo de pesquisa */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar vídeos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Botão de filtros */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (showFilters) {
                  // Se está fechando os filtros, limpar os valores
                  setVideoType("");
                  setCategory("");
                }
                setShowFilters(!showFilters);
              }}
              className={`flex-shrink-0 ${showFilters ? 'bg-yellow-400 hover:bg-yellow-500 border-yellow-400' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </Button>
          </div>

          

          {/* Filtros expansíveis */}
          {showFilters && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="video">Vídeos</SelectItem>
                  <SelectItem value="playlist">Playlist</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories?.filter(cat => cat.isActive).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Lista de Vídeos */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredVideos.length > 0 ? (
          <div className="space-y-4">
            {filteredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Premium Badge - Apenas quando não há vídeos */}
            <div className="bg-gradient-to-r from-yellow-100/80 to-orange-100/80 border border-yellow-200/80 rounded-xl p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-full shadow-lg">
                  <Star className="h-8 w-8 text-white" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Conteúdo Exclusivo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Acesse vídeos premium com dicas exclusivas de beleza, tutoriais avançados e segredos profissionais
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}