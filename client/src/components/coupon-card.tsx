import { Coupon } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Calendar } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import { useAuth } from "@/hooks/use-auth";
import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";
import CountdownTimer from "@/components/countdown-timer";
import { useState } from "react";
import { toEpochMs } from "@/lib/time";

interface CouponCardProps {
  coupon: Coupon;
  viewMode?: 'premium' | 'free';
}

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'makeup':
      return 'Maquiagem';
    case 'skincare':
      return 'Skincare';
    case 'perfume':
      return 'Perfumes';
    case 'hair':
      return 'Cabelos';
    default:
      return category;
  }
};

export default function CouponCard({ coupon, viewMode: propViewMode }: CouponCardProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { viewMode: adminViewMode } = useAdmin();
  const [showPremiumModal, setShowPremiumModal] = useState(false);


  // For admins, always use admin view mode; for others, use prop or default to premium
  const effectiveViewMode = (user?.isAdmin ? adminViewMode : propViewMode) || 'premium';

  const copyCouponMutation = useMutation({
    mutationFn: async () => {
      await navigator.clipboard.writeText(coupon.code);

      await apiRequest("POST", "/api/activity", {
        action: "coupon_used",
        resourceId: coupon.id,
        resourceType: "coupon",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/activity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });

      toast({
        title: "Cupom Copiado!",
        description: "O código foi copiado para a área de transferência",
      });
    },
    onError: () => {
      // Still try to copy even if activity tracking fails
      navigator.clipboard.writeText(coupon.code);
      toast({
        title: "Cupom Copiado!",
        description: "O código foi copiado para a área de transferência",
      });
    },
  });

  const getCouponGradient = () => {
    const gradients = [
      'bg-gradient-to-r from-primary to-accent',
      'bg-gradient-to-r from-purple-500 to-pink-500',
      'bg-gradient-to-r from-green-500 to-teal-500',
      'bg-gradient-to-r from-orange-500 to-red-500',
      'bg-gradient-to-r from-blue-500 to-indigo-500',
      'bg-gradient-to-r from-pink-500 to-rose-500',
    ];

    // Use coupon ID to consistently select a gradient
    const index = coupon.id.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const formatExpiryDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const isExpired = () => {
    const expirationDate = coupon.endDateTime || coupon.expiryDate;
    const expMs = toEpochMs(expirationDate);
    return expMs !== null && expMs < Date.now();
  };

  const isScheduled = () => {
    const startMs = toEpochMs(coupon.startDateTime);
    const now = Date.now();
    const result = startMs !== null && startMs > now;
    
    console.log(`[CouponCard] ${coupon.brand} - isScheduled check:`);
    console.log('startDateTime:', coupon.startDateTime);
    console.log('startMs:', startMs);
    console.log('now:', now);
    console.log('startMs > now:', startMs > now);
    console.log('result:', result);
    
    return result;
  };

  const handleCopyCoupon = () => {
    if (isExpired()) {
      toast({
        title: "Cupom Expirado",
        description: "Este cupom não está mais válido",
        variant: "destructive",
      });
      return;
    }

    copyCouponMutation.mutate();
  };

  const handleGoToStore = () => {
    if (coupon.storeUrl) {
      window.open(coupon.storeUrl, '_blank');
    }
  };

  const handlePremiumClick = () => {
    setShowPremiumModal(true);
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-[380px] flex flex-col" data-testid={`coupon-card-${coupon.id}`}>
      <div className={`${getCouponGradient()} p-4 text-white relative overflow-hidden h-40 flex flex-col justify-between`}>
        {/* Cover image if available */}
        {coupon.coverImageUrl && (
          <img
            src={coupon.coverImageUrl}
            alt={coupon.brand}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent"></div>
        
        {/* Decorative circles - only show when no image */}
        {!coupon.coverImageUrl && (
          <>
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-white/20 rounded-full"></div>
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full"></div>
          </>
        )}

        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-xl" data-testid={`coupon-brand-${coupon.id}`}>
              {coupon.brand}
            </h4>
            <span className="text-2xl font-bold" data-testid={`coupon-discount-${coupon.id}`}>
              {coupon.discount}
            </span>
          </div>

          <p className="text-sm opacity-90 mb-4 line-clamp-2" data-testid={`coupon-description-${coupon.id}`}>
            {coupon.description}
          </p>

          <div className="flex items-center justify-between">
            <code
              className={`bg-white/20 px-3 py-1 rounded text-sm font-mono ${
                effectiveViewMode === 'free' && coupon.isExclusive
                  ? 'blur-sm select-none cursor-not-allowed'
                  : ''
              }`}
              data-testid={`coupon-code-${coupon.id}`}
            >
              {effectiveViewMode === 'free' && coupon.isExclusive ? '●●●●●●●●' : coupon.code}
            </code>
            {effectiveViewMode === 'free' && coupon.isExclusive ? (
              <Button
                size="sm"
                onClick={handlePremiumClick}
                className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] animate-[gradient-shift_2s_ease-in-out_infinite] text-white font-semibold cursor-pointer text-xs"
                data-testid={`button-premium-coupon-${coupon.id}`}
              >
                Premium
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleCopyCoupon}
                disabled={copyCouponMutation.isPending || isExpired()}
                className="bg-white text-gray-800 hover:bg-gray-100 font-medium"
                data-testid={`button-copy-coupon-${coupon.id}`}
              >
                <Copy className="w-3 h-3 mr-1" />
                {copyCouponMutation.isPending ? "Copiando..." : "Copiar"}
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {coupon.category && (
              <Badge variant="outline" className="text-xs">
                {getCategoryLabel(coupon.category)}
              </Badge>
            )}
            {coupon.isExclusive && (
              <Badge className="bg-purple-100 text-purple-700 text-xs">Exclusivo</Badge>
            )}
            {isExpired() && (
              <Badge variant="destructive" className="ml-2">Expirado</Badge>
            )}
          </div>

          {(coupon.endDateTime || coupon.expiryDate || coupon.startDateTime) && (
            isExpired() ? (
              <div className="flex flex-col items-center justify-center gap-1 text-red-600 text-sm font-medium bg-red-50 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Cupom Expirado</span>
                </div>
                <span className="text-xs text-red-500">Aguarde por mais cupons relâmpago!</span>
              </div>
            ) : isScheduled() ? (
              <div className="flex flex-col items-center justify-center gap-1 text-orange-600 text-sm font-medium bg-orange-50 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Em Vinculação</span>
                </div>
                <span className="text-xs text-orange-500">
                  Ativa em: {new Date(coupon.startDateTime!).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit', 
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ) : (
              <CountdownTimer expiryDate={coupon.endDateTime || coupon.expiryDate} compact={true} />
            )
          )}
        </div>

        <div className="mt-auto pt-3">
          {effectiveViewMode === 'free' && coupon.isExclusive ? (
            <Button
              size="sm"
              onClick={handlePremiumClick}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 bg-[length:200%_100%] animate-[gradient-shift_2s_ease-in-out_infinite] text-white font-semibold cursor-pointer"
              data-testid={`button-premium-store-${coupon.id}`}
            >
              Exclusivo para membros Premium
            </Button>
          ) : coupon.storeUrl ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGoToStore}
              className="w-full text-primary hover:text-primary/80"
              data-testid={`button-store-${coupon.id}`}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Ir para a loja
            </Button>
          ) : (
            <div className="h-8"></div>
          )}
        </div>
      </CardContent>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        contentType="coupon"
        contentTitle={coupon.title}
      />
    </Card>
  );
}