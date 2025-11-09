import Sidebar from "@/components/sidebar";
import VideoCard from "@/components/video-card";
import BannerCarousel from "@/components/banner-carousel";
import { useQuery } from "@tanstack/react-query";
import { Video } from "@shared/schema";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainContent } from "@/components/main-content";
import { PopupSystem } from "@/components/popup-system";

export default function VideosPage() {
  const isMobile = useIsMobile();
  const [videoType, setVideoType] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: banners } = useQuery<any[]>({
    queryKey: ["/api/banners"],
  });

  // Verificar se há banners ativos na página videos
  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "videos") || [];
  const hasActiveBanners = activeBanners.length > 0;

  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const filteredVideos = videos?.filter((video) => {
    const matchesType = !videoType || videoType === "all" || video.type === videoType;
    const matchesCategory = !category || category === "all" || video.categoryId === category;
    const matchesSearch = !searchTerm ||
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesCategory && matchesSearch;
  }) || [];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
        <BannerCarousel page="videos" />
        <PopupSystem trigger="page_specific" targetPage="videos" />
        <div className={`container mx-auto px-6 ${!hasActiveBanners ? (isMobile ? 'pt-32 pb-8' : 'pt-24 pb-8') : 'py-8'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
            <h2 className="text-3xl font-bold text-foreground">Vídeos Exclusivos</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Select value={videoType} onValueChange={setVideoType}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-video-type">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="video">Vídeos</SelectItem>
                  <SelectItem value="playlist">Playlist</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-video-category">
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

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar vídeos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                  data-testid="input-search-videos"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="uniform-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="uniform-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm || category || videoType ?
                  "Nenhum vídeo encontrado com os filtros aplicados" :
                  "Nenhum vídeo disponível no momento"
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}