import Sidebar from "@/components/sidebar";
import BannerCarousel from "@/components/banner-carousel";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Play, Download, Tag, Settings, User, Calendar, Heart, UserPlus, Users, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { PopupSystem } from "@/components/popup-system";
import { useAdmin } from "@/contexts/admin-context";

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

export default function ProfilePage() {
  const isMobile = useIsMobile();
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

  // Full page skeleton during loading - shows only main content
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />

        <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
          <BannerCarousel page="profile" />
          <div className={`container mx-auto px-6 py-8 ${!hasActiveBanners ? (isMobile ? 'pt-32' : 'pt-20') : ''}`}>
            {/* Profile Header Skeleton */}
            <Card className="mb-8">
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-6 sm:space-y-0 sm:space-x-6">
                  <Skeleton className="w-24 h-24 rounded-full" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex gap-3">
                      <Skeleton className="h-10 w-32" />
                      <Skeleton className="h-10 w-32" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="text-center">
                  <CardContent className="p-6">
                    <Skeleton className="w-12 h-12 rounded-full mx-auto mb-3" />
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Activity Skeleton */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold text-foreground">
                  <Skeleton className="h-6 w-48" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 py-3 border-b border-border last:border-b-0">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Normal layout when data is loaded
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
        <BannerCarousel page="profile" />
        <PopupSystem trigger="page_specific" targetPage="profile" />
        <div className={`container mx-auto px-6 py-8 ${!hasActiveBanners ? (isMobile ? 'pt-32' : 'pt-20') : ''}`}>
          {/* Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-6 sm:space-y-0 sm:space-x-6">
                <Avatar className="w-24 h-24">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white text-2xl font-bold">
                      {user ? getUserInitials(user.name) : 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-user-name">
                    {user?.name || 'Usuário'}
                  </h2>
                  <p className="text-muted-foreground mb-4" data-testid="text-user-email">
                    {user?.email || 'email@exemplo.com'}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <Badge className={`${
                      user?.isAdmin && viewMode === 'free'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}>
                      {user?.isAdmin && viewMode === 'free' ? 'Plano Free' : 'Plano Premium'}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      Membro desde Janeiro 2024
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleEditProfile}
                      disabled={isEditProfileLoading}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      data-testid="button-edit-profile"
                    >
                      {isEditProfileLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Carregando...
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4 mr-2" />
                          Editar Perfil
                        </>
                      )}
                    </Button>
                    {/* Botão de Segurança */}
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/seguranca")}
                      data-testid="button-security"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Segurança
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setLocation("/configuracoes-notificacoes")}
                      data-testid="button-settings"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configurações
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Play className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-1" data-testid="stat-videos-watched">
                  {stats?.videosWatched || 0}
                </h3>
                <p className="text-sm text-muted-foreground">Vídeos Assistidos</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Download className="w-6 h-6 text-accent" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-1" data-testid="stat-downloads">
                  {stats?.downloads || 0}
                </h3>
                <p className="text-sm text-muted-foreground">Downloads Realizados</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Tag className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-1" data-testid="stat-coupons-used">
                  {stats?.couponsUsed || 0}
                </h3>
                <p className="text-sm text-muted-foreground">Cupons Utilizados</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-1" data-testid="stat-referrals">
                  {referralStats?.totalReferrals || 0}
                </h3>
                <p className="text-sm text-muted-foreground">Cheirosas Convidadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-foreground">Atividade Recente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities && activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4 py-3 border-b border-border last:border-b-0">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        {getActivityIcon(activity.action)}
                      </div>
                      <div className="flex-1">
                        <p className="text-foreground font-medium" data-testid={`activity-${activity.id}`}>
                          {getActivityDescription(activity.action, activity.resourceId || undefined)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(activity.createdAt!)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhuma atividade recente encontrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}