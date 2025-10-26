import { Product } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Book, Play, FileText, CheckSquare } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import { useAuth } from "@/hooks/use-auth";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import { useState } from "react";

interface ProductCardProps {
  product: Product;
  viewMode?: 'premium' | 'free';
}

export default function ProductCard({ product, viewMode: propViewMode }: ProductCardProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { viewMode: adminViewMode } = useAdmin();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // For admins, always use admin view mode; for others, use prop or default to premium  
  const effectiveViewMode = (user?.isAdmin ? adminViewMode : propViewMode) || 'premium';

  const downloadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/activity", {
        action: "product_downloaded",
        resourceId: product.id,
        resourceType: "product",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });

      if (product.fileUrl) {
        window.open(product.fileUrl, '_blank');
      }

      toast({
        title: "Download Iniciado",
        description: "O produto foi baixado com sucesso!",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao baixar produto",
        variant: "destructive",
      });
    },
  });

  const getProductIcon = () => {
    switch (product.type) {
      case 'ebook':
        return Book;
      case 'course':
      case 'course_video':
      case 'course_playlist':
        return Play;
      case 'pdf':
        return FileText;
      case 'checklist':
        return CheckSquare;
      default:
        return Download;
    }
  };

  const getProductColor = () => {
    switch (product.type) {
      case 'ebook':
        return 'gradient-gold';
      case 'course':
      case 'course_video':
      case 'course_playlist':
        return 'gradient-primary';
      case 'pdf':
        return 'bg-gradient-to-br from-purple-500 to-pink-500';
      case 'checklist':
        return 'bg-gradient-to-br from-green-500 to-teal-500';
      default:
        return 'gradient-primary';
    }
  };

  const getProductLabel = () => {
    switch (product.type) {
      case 'ebook':
        return 'E-book';
      case 'course':
        return 'Curso';
      case 'course_video':
        return 'Curso - Vídeo Único';
      case 'course_playlist':
        return 'Curso - Playlist';
      case 'pdf':
        return 'PDF';
      case 'checklist':
        return 'Checklist';
      default:
        return 'Produto';
    }
  };

  const getActionText = () => {
    switch (product.type) {
      case 'course':
      case 'course_video':
      case 'course_playlist':
        return 'Iniciar Curso';
      case 'ebook':
        return 'Baixar E-book';
      case 'pdf':
        return 'Download PDF';
      case 'checklist':
        return 'Baixar Lista';
      default:
        return 'Baixar Agora';
    }
  };

  const ProductIcon = getProductIcon();

  const handleDownload = () => {
    // Se for curso de playlist, abre como playlist
    if (product.type === 'course_playlist') {
      navigate(`/playlist/${product.id}?from=product`);
      return;
    }

    // Se for curso de vídeo único, abre como vídeo
    if (product.type === 'course_video') {
      navigate(`/video/${product.id}?from=product`);
      return;
    }

    // Compatibilidade com tipo antigo 'course' - verificar URL para decidir
    if (product.type === 'course') {
      const extractPlaylistId = (url: string): string | null => {
        const regex = /(?:list=|list\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
      };

      const extractVideoId = (url: string): string | null => {
        const regex = /(?:v=|youtu\.be\/|embed\/|watch\?v=|v\/|e\/|watch\?.*&v=)([^&\n?#]+)/;
        const match = url.match(regex);
        if (match && match[1]) {
          let videoId = match[1];
          if (videoId.includes('?')) {
            videoId = videoId.split('?')[0];
          }
          if (videoId.includes('&')) {
            videoId = videoId.split('&')[0];
          }
          return videoId;
        }
        return null;
      };

      const playlistId = extractPlaylistId(product.fileUrl);
      const videoId = extractVideoId(product.fileUrl);

      if (playlistId) {
        navigate(`/playlist/${product.id}?from=product`);
      } else if (videoId) {
        navigate(`/video/${product.id}?from=product`);
      }
      return;
    }

    // Para outros produtos, mantém o comportamento de download
    downloadMutation.mutate();
  };

  const handlePremiumClick = () => {
    setShowPremiumModal(true);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full min-h-[320px] flex flex-col" data-testid={`product-card-${product.id}`}>
      <div
        className={`${product.coverImageUrl ? 'bg-cover bg-center' : getProductColor()} p-4 text-center h-40 flex flex-col justify-center shrink-0 relative`}
        style={product.coverImageUrl ? { backgroundImage: `url(${product.coverImageUrl})` } : {}}
      >
        {product.coverImageUrl && (
          <div className="absolute inset-0 bg-black/40" />
        )}
        <div className="relative z-10">
          <div className={`${product.coverImageUrl ? 'bg-black/20 backdrop-blur-sm rounded-lg p-3' : ''}`}>
            <ProductIcon className="w-10 h-10 text-white mx-auto mb-3" />
            <h4 className="font-bold text-white text-sm leading-tight" data-testid={`product-title-${product.id}`}>
              {product.title}
            </h4>
          </div>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex-1 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs shrink-0">
                {getProductLabel()}
              </Badge>
              {product.isExclusive && (
                <Badge className="bg-purple-100 text-purple-700 text-xs shrink-0">Exclusivo</Badge>
              )}
              <Badge className="bg-accent/10 text-accent text-xs shrink-0">
                Disponível
              </Badge>
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {product.description}
              </p>
            )}
          </div>

          <div className="pt-4">
            {effectiveViewMode === 'free' && product.isExclusive ? (
              <Button
                size="sm"
                onClick={handlePremiumClick}
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] animate-[gradient-shift_2s_ease-in-out_infinite] text-white font-semibold hover:from-purple-600 hover:via-pink-600 hover:to-purple-600 cursor-pointer"
                data-testid={`button-premium-product-${product.id}`}
              >
                Exclusivo para membros Premium
              </Button>
            ) : (
              <Button
                onClick={handleDownload}
                disabled={downloadMutation.isPending || !product.isActive}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid={`button-download-product-${product.id}`}
              >
                {product.type === 'course' ? (
                  <Play className="w-4 h-4 mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {downloadMutation.isPending ? "Processando..." : getActionText()}
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        contentType="product"
        contentTitle={product.title}
      />
    </Card>
  );
}