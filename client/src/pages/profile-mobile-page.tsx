import { useQuery } from "@tanstack/react-query";
import { Activity } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Tag, User, Calendar, Heart, UserPlus, Users, Edit3, ArrowLeft, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useAdmin } from "@/contexts/admin-context";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import BannerCarousel from "@/components/banner-carousel";

interface UserStats {
  videosWatched: number;
  downloads: number;
  couponsUsed: number;
}

interface ReferralStats {
  totalReferrals: number;
  freeReferrals: number;
  premiumReferrals: number;
  totalPointsEarned: number;
}

export default function ProfileMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { viewMode, isAdminMode } = useAdmin();
  const [isEditProfileLoading, setIsEditProfileLoading] = useState(false);

  const { data: banners } = useQuery<any[]>({
    queryKey: ["/api/banners"],
  });

  // Verificar se há banners ativos na página profile
  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "profile") || [];
  const hasActiveBanners = activeBanners.length > 0;

  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery<Activity[]>({
    queryKey: ["/api/user/activity"],
  });

  const { data: referralStats, isLoading: referralStatsLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/user/referral-stats"],
  });

  // Verificar se qualquer dados principais estão carregando para mostrar skeleton de página inteira
  const isPageLoading = statsLoading || activitiesLoading || referralStatsLoading;

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'video_watched':
        return <Play className="w-4 h-4 text-primary" />;
      case 'product_downloaded':
        return <Download className="w-4 h-4 text-accent" />;
      case 'coupon_used':
        return <Tag className="w-4 h-4 text-green-500" />;
      case 'profile_updated':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'referral_used':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      default:
        return <Heart className="w-4 h-4 text-purple-500" />;
    }
  };

  const getActivityDescription = (action: string, resourceId?: string) => {
    switch (action) {
      case 'video_watched':
        return resourceId ? `Assistiu um vídeo` : 'Assistiu um vídeo';
      case 'product_downloaded':
        return 'Baixou um produto digital';
      case 'coupon_used':
        return 'Usou um cupom de desconto';
      case 'profile_updated':
        return 'Atualizou o perfil';
      case 'referral_used':
        return 'Alguém se cadastrou usando seu link de convite! 🎉';
      default:
        return 'Atividade realizada';
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    // Adiciona 3 horas para ajustar para o horário de Brasília
    const brazilDate = new Date(date.getTime() + (3 * 60 * 60 * 1000));
    return brazilDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMemberSince = (dateString: string | Date | undefined) => {
    if (!dateString) return 'Janeiro 2024';
    const date = new Date(dateString);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleEditProfile = async () => {
    setIsEditProfileLoading(true);

    // Simula um pequeno delay para garantir que os dados estão carregados
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verifica se o usuário e seus dados estão carregados
    if (user && user.name && user.email) {
      setLocation("/meuperfil");
    }

    setIsEditProfileLoading(false);
  };

  const handleSecurityClick = () => {
    setLocation("/seguranca"); // Assuming '/seguranca' is the route for the security page
  };

  const handleBackClick = () => {
    setLocation('/mobile-menu');
  };

  // Full page skeleton during loading
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className="text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-left flex-1 ml-4">
              <h1 className="text-lg font-semibold text-foreground">Perfil</h1>
              <p className="text-sm text-muted-foreground">Suas informações e atividades</p>
            </div>
            <User className="h-5 w-5 text-primary" />
          </div>
        </div>

        <div className="pt-20">
          <BannerCarousel page="profile" />
        </div>

        <main className={`px-4 pb-4 ${!hasActiveBanners ? 'pt-4' : 'pt-4'}`}>
          {/* Profile Header Skeleton */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="w-20 h-20 rounded-full" />
                <div className="space-y-2 text-center">
                  <Skeleton className="h-6 w-32 mx-auto" />
                  <Skeleton className="h-4 w-48 mx-auto" />
                  <Skeleton className="h-6 w-24 mx-auto" />
                </div>
                <div className="flex gap-3 w-full">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="text-center">
                <CardContent className="p-4">
                  <Skeleton className="w-8 h-8 rounded-full mx-auto mb-2" />
                  <Skeleton className="h-6 w-12 mx-auto mb-1" />
                  <Skeleton className="h-3 w-20 mx-auto" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-foreground">
                <Skeleton className="h-5 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3 py-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>

        <MobileBottomNav />
      </div>
    );
  }

  // Normal layout when data is loaded
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackClick}
            className="text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Perfil</h1>
            <p className="text-sm text-muted-foreground">Suas informações e atividades</p>
          </div>
          <User className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-20">
        <BannerCarousel page="profile" />
      </div>

      <main className={`px-4 pb-4 ${!hasActiveBanners ? 'pt-4' : 'pt-4'}`}>
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white text-xl font-bold">
                      {user ? getUserInitials(user.name) : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
              </div>

              <div className="text-left space-y-2 w-full">
                <h2 className="text-xl font-bold text-foreground" data-testid="text-user-name">
                  {user?.name || 'Usuário'}
                </h2>
                <p className="text-sm text-muted-foreground" data-testid="text-user-email">
                  {user?.email || 'email@exemplo.com'}
                </p>
                <div className="flex flex-col items-start gap-2">
                  <Badge 
                    className={`text-xs px-2 py-1 ${
                      ((user?.isAdmin ? viewMode : user.planType) || 'free') === 'premium' 
                        ? 'bg-yellow-500 text-black hover:bg-yellow-600' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {((user?.isAdmin ? viewMode : user.planType) || 'free') === 'premium' ? 'Acesso Premium' : 'Acesso Free'}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Membro desde {formatMemberSince(user?.createdAt)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <Button
                  onClick={handleEditProfile}
                  disabled={isEditProfileLoading}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-edit-profile"
                >
                  {isEditProfileLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar Perfil
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSecurityClick}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-security"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Segurança
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="text-center">
            <CardContent className="p-4">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Play className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="stat-videos-watched">
                {stats?.videosWatched || 0}
              </h3>
              <p className="text-xs text-muted-foreground">Vídeos</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-4">
              <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Download className="w-4 h-4 text-accent" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="stat-downloads">
                {stats?.downloads || 0}
              </h3>
              <p className="text-xs text-muted-foreground">Downloads</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Tag className="w-4 h-4 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="stat-coupons-used">
                {stats?.couponsUsed || 0}
              </h3>
              <p className="text-xs text-muted-foreground">Cupons</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-4">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-4 h-4 text-purple-500" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1" data-testid="stat-referrals">
                {referralStats?.totalReferrals || 0}
              </h3>
              <p className="text-xs text-muted-foreground">Cheirosas</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities && activities.length > 0 ? (
                activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 py-2 border-b border-border last:border-b-0">
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-medium truncate" data-testid={`activity-${activity.id}`}>
                        {getActivityDescription(activity.action, activity.resourceId || undefined)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(activity.createdAt!)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Nenhuma atividade recente encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <MobileBottomNav />
    </div>
  );
}