import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/sidebar";
import ShareModal from "@/components/share-modal";
import {
  Crown,
  Star,
  Trophy,
  Gift,
  Sparkles,
  Heart,
  Diamond,
  Medal,
  Zap,
  Calendar,
  Download,
  MessageCircle,
  Tag,
  Users,
  Target,
  Coins,
  Award,
  CheckCircle,
  Clock,
  Flame,
  Eye,
  Info,
  TrendingUp,
  ShoppingBag,
  Gamepad2,
  Lightbulb,
  ArrowRight,
  Share2,
  UserPlus
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Função para calcular o próximo nível e pontos necessários
const calculateNextLevelInfo = (currentLevel: string, totalPoints: number) => {
  const levelConfigs = {
    bronze: { nextLevel: 'silver', nextLevelPoints: 100 },
    silver: { nextLevel: 'gold', nextLevelPoints: 500 },
    gold: { nextLevel: 'diamond', nextLevelPoints: 1500 },
    diamond: { nextLevel: 'diamond', nextLevelPoints: 9999 }
  };
  
  const config = levelConfigs[currentLevel as keyof typeof levelConfigs] || levelConfigs.bronze;
  return {
    nextLevel: config.nextLevel,
    nextLevelPoints: config.nextLevelPoints,
    pointsToNext: Math.max(0, config.nextLevelPoints - totalPoints)
  };
};

// Função para obter dados padrão do usuário
const getUserDisplayData = (user: any, currentUserPoints: any) => {
  // Se a API retornou dados de pontos do usuário, usa esses dados
  if (currentUserPoints?.userPoints) {
    return {
      name: user?.name || 'Usuário',
      avatar: user?.avatar && !user.avatar.startsWith('data:') ? `/uploads/${user.avatar}` : user?.avatar,
      totalPoints: currentUserPoints.userPoints.totalPoints || 0,
      currentLevel: currentUserPoints.userPoints.currentLevel || 'bronze',
      levelProgress: currentUserPoints.userPoints.levelProgress || 0
    };
  }
  
  // Fallback para estrutura direta (caso a API mude)
  return {
    name: user?.name || 'Usuário',
    avatar: user?.avatar && !user.avatar.startsWith('data:') ? `/uploads/${user.avatar}` : user?.avatar,
    totalPoints: currentUserPoints?.totalPoints || 0,
    currentLevel: currentUserPoints?.currentLevel || 'bronze',
    levelProgress: currentUserPoints?.levelProgress || 0
  };
};

// Definindo a interface para os dados de sorteio esperados da API
interface Raffle {
  id: number;
  title: string;
  description: string;
  prizeDescription: string;
  endDate: string;
  imageUrl?: string;
  category?: string;
  premiumOnly?: boolean;
  prizeValue?: number;
  sponsorName?: string;
  totalEntries: number;
  entryCost: number;
  minLevel?: string;
}

export default function CheirosasPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();

  

  // Estados para dados da API
  const [activeTab, setActiveTab] = useState("ranking");
  const [showShareModal, setShowShareModal] = useState(false);

  // Queries com cache otimizado para dados da página
  const { data: currentUserPoints, isLoading: pointsLoading, refetch: refetchPoints } = useQuery({
    queryKey: ["/api/gamification/user-points"],
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutos para dados de pontos (atualiza com frequência)
    cacheTime: 5 * 60 * 1000, // 5 minutos em cache
  });

  // Buscar ranking
  const { data: rankingData, isLoading: rankingLoading } = useQuery({
    queryKey: ["/api/gamification/ranking"],
    staleTime: 3 * 60 * 1000, // 3 minutos para ranking
  });

  // Buscar missões
  const { data: missionsData, isLoading: missionsLoading } = useQuery({
    queryKey: ["/api/gamification/missions"],
    select: (data) => data?.missions || [],
    staleTime: 5 * 60 * 1000, // 5 minutos para missões
  });

  // Buscar sorteios
  const { data: rafflesData, isLoading: rafflesLoading } = useQuery({
    queryKey: ["/api/gamification/raffles"],
    select: (data) => {
      const raffles = data?.raffles || [];
      return raffles.map((raffle: any) => ({
        id: raffle.id,
        title: raffle.title || 'Sorteio',
        description: raffle.description || '',
        prizeDescription: raffle.prize_description || raffle.prizeDescription || raffle.prize || 'Prêmio especial',
        endDate: raffle.end_date || raffle.endDate,
        imageUrl: raffle.image_url || raffle.imageUrl,
        category: raffle.category || 'Geral',
        premiumOnly: raffle.premium_only || raffle.premiumOnly || false,
        prizeValue: parseFloat(raffle.prize_value || raffle.prizeValue || 0),
        sponsorName: raffle.sponsor_name || raffle.sponsorName,
        totalEntries: raffle.total_entries || raffle.totalEntries || 0,
        entryCost: raffle.entry_cost || raffle.entryCost || 1,
        minLevel: raffle.min_level || raffle.minLevel || 'bronze'
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos para sorteios
  });

  // Buscar recompensas
  const { data: rewardsData, isLoading: rewardsLoading } = useQuery({
    queryKey: ["/api/gamification/rewards"],
    select: (data) => {
      const rewards = data?.rewards || [];
      return rewards.map((reward: any) => ({
        id: reward.id,
        title: reward.title || 'Recompensa',
        description: reward.description || '',
        cost: reward.points_cost || reward.pointsCost || reward.cost || 0,
        stock: reward.stock_quantity || reward.stockQuantity || reward.stock || -1,
        rewardType: reward.reward_type || reward.rewardType || 'custom',
        imageUrl: reward.image_url || reward.imageUrl
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutos para recompensas
  });

  // Buscar configurações de compartilhamento
  const { data: shareSettingsData, isLoading: shareSettingsLoading } = useQuery({
    queryKey: ["/api/admin/share-settings"],
    select: (data) => ({
      freeReferralPoints: data?.freeReferralPoints || 25,
      premiumReferralPoints: data?.premiumReferralPoints || 50
    }),
    staleTime: 10 * 60 * 1000, // 10 minutos para configurações (mudança rara)
  });

  // Dados processados das queries
  const ranking = rankingData || [];
  const missions = missionsData || [];
  const rewards = rewardsData || [];
  const raffles = rafflesData || [];
  const shareSettings = shareSettingsData || { freeReferralPoints: 25, premiumReferralPoints: 50 };

  const { toast } = useToast();

  const userDisplayData = getUserDisplayData(user, currentUserPoints);
  
  const nextLevelInfo = calculateNextLevelInfo(userDisplayData.currentLevel, userDisplayData.totalPoints);
  const levelConfig = getLevelConfig(userDisplayData.currentLevel);
  const LevelIcon = levelConfig.icon;
  const nextLevelConfig = getLevelConfig(nextLevelInfo.nextLevel);

  // Mutations para ações de gamificação com cache inteligente
  const completeMissionMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const response = await fetch(`/api/gamification/missions/${missionId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao completar missão');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      // Invalidar todas as queries relacionadas para atualizar cache
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/missions"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/user-points"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/ranking"] }),
      ]);
      
      toast({
        title: "Missão concluída!",
        description: `Você ganhou ${data.pointsEarned} pontos!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao completar missão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const redeemRewardMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const response = await fetch(`/api/gamification/rewards/${rewardId}/redeem`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao resgatar recompensa');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      // Invalidar queries para refletir mudanças nos pontos e estoque
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/rewards"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/user-points"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/ranking"] }),
      ]);
      
      toast({
        title: "Recompensa resgatada!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resgatar recompensa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const enterRaffleMutation = useMutation({
    mutationFn: async ({ raffleId, entries }: { raffleId: string; entries: number }) => {
      const response = await fetch(`/api/gamification/raffles/${raffleId}/enter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao participar do sorteio');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      // Invalidar queries para atualizar sorteios e pontos
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/raffles"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/user-points"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/gamification/ranking"] }),
      ]);
      
      toast({
        title: "Participação confirmada!",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao participar do sorteio",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  const inviteFriends = () => {
    setShowShareModal(true);
    console.log('Convidando amigas para o sistema');
  };

  // Controle de loading usando apenas as queries do TanStack Query
  const showLoading = pointsLoading || rankingLoading || missionsLoading || rafflesLoading || rewardsLoading || shareSettingsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 overflow-x-hidden ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        {showLoading ? (
          // Skeleton para toda a página
          <div>
            {/* Header Skeleton */}
            <div className="bg-white dark:bg-gray-800 border-b">
              <div className="container mx-auto px-6 py-12">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <Skeleton className="w-28 h-28 rounded-full" />
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-64" />
                      <Skeleton className="h-4 w-80" />
                      <div className="flex gap-4">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="w-full lg:w-80 space-y-4">
                    <Skeleton className="h-20 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>

            {/* Content Skeleton */}
            <div className="container mx-auto px-6 py-8">
              {/* Tabs Skeleton */}
              <div className="w-full mb-8">
                <div className="grid grid-cols-6 gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 border">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              </div>

              {/* Tab Content Skeleton */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 border rounded-lg">
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Skeleton className="w-8 h-8" />
                      <Skeleton className="h-8 w-48" />
                    </div>
                    <Skeleton className="h-4 w-96 mb-6" />

                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 bg-muted/20 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-8 h-8 rounded-full" />
                          </div>
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-16" />
                            </div>
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-6 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Conteúdo real da página
          <>
            {/* Header da Página */}
            <div className="relative overflow-hidden bg-gradient-to-r from-pink-500 via-purple-600 to-pink-600 dark:from-pink-900 dark:via-purple-900 dark:to-pink-900">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative container mx-auto px-6 py-12">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  {/* Perfil da Usuária */}
                  <div className="flex items-center gap-6 text-white">
                    <Avatar className="w-28 h-28 border-4 border-white/30">
                      <AvatarImage src={userDisplayData.avatar} className="object-cover" />
                      <AvatarFallback className="text-4xl bg-white/20">
                        {userDisplayData.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-3xl font-bold mb-2">
                        Olá, {userDisplayData.name}! 💖
                      </h1>
                      <p className="text-white/90 mb-3">
                        Bem-vinda ao seu mundo de conquistas e recompensas!
                      </p>
                      <div className="flex items-center gap-4">
                        <Badge className={`${levelConfig.bgColor} ${levelConfig.color} font-semibold px-3 py-1`}>
                          <LevelIcon className="w-4 h-4 mr-1" />
                          {levelConfig.name}
                        </Badge>
                        <div className="flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
                          <Coins className="w-4 h-4" />
                          <span className="font-bold">{userDisplayData.totalPoints} pontos</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progresso para próximo nível e Botão de Convite */}
                  <div className="flex flex-col gap-4 w-full lg:w-80">
                    <Card className="bg-white/10 border-white/20 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between text-white mb-2">
                          <span className="text-sm">Progresso para {nextLevelConfig.name}</span>
                          <span className="text-sm font-bold">{userDisplayData.totalPoints}/{nextLevelInfo.nextLevelPoints}</span>
                        </div>
                        <Progress
                          value={userDisplayData.currentLevel === 'diamond' ? 100 : ((userDisplayData.totalPoints / nextLevelInfo.nextLevelPoints) * 100)}
                          className="h-3 bg-white/20"
                        />
                        <p className="text-white/80 text-sm mt-2">
                          {userDisplayData.currentLevel === 'diamond' 
                            ? 'Parabéns! Você já alcançou o nível máximo!' 
                            : `Faltam ${nextLevelInfo.pointsToNext} pontos para o próximo nível!`}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Botão de Compartilhar/Convidar Cheirosas */}
                    <button
                      onClick={inviteFriends}
                      className="relative w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 border-0 outline-none cursor-pointer z-10"
                      type="button"
                      style={{
                        position: 'relative',
                        pointerEvents: 'auto',
                        touchAction: 'manipulation'
                      }}
                    >
                      <div className="flex items-center gap-2" style={{ pointerEvents: 'none' }}>
                        <Share2 className="w-5 h-5" style={{ pointerEvents: 'none' }} />
                        <span className="text-lg whitespace-nowrap" style={{ pointerEvents: 'none' }}>Convidar Cheirosas</span>
                      </div>
                      <div className="text-white/90 text-sm font-medium" style={{ pointerEvents: 'none' }}>
                        Free +{shareSettings.freeReferralPoints}pts • Premium +{shareSettings.premiumReferralPoints}pts
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
                <Sparkles className="w-full h-full" />
              </div>
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <Heart className="w-full h-full" />
              </div>
            </div>

            {/* Conteúdo Principal */}
            <div className="container mx-auto px-6 py-8">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-6 mb-8 bg-white/70 backdrop-blur-sm">
                  <TabsTrigger value="ranking" className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    {!isMobile && "Ranking"}
                  </TabsTrigger>
                  <TabsTrigger value="missions" className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    {!isMobile && "Missões"}
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="flex items-center gap-2">
                    <Gift className="w-4 h-4" />
                    {!isMobile && "Loja"}
                  </TabsTrigger>
                  <TabsTrigger value="raffles" className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {!isMobile && "Sorteios"}
                  </TabsTrigger>
                  <TabsTrigger value="fame" className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {!isMobile && "Fama"}
                  </TabsTrigger>
                  <TabsTrigger value="guide" className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    {!isMobile && "Saiba Mais"}
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Ranking de Engajamento */}
                <TabsContent value="ranking" className="space-y-6">
                  <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Ranking das Cheirosas
                      </CardTitle>
                      <CardDescription>
                        TOP 10 cheirosas mais engajadas do mês
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {ranking.length > 0 ? ranking.map((rankUser, index) => {
                          const userLevelConfig = getLevelConfig(rankUser.currentLevel || 'bronze');
                          const UserLevelIcon = userLevelConfig.icon;
                          const position = index + 1;
                          const isCurrentUser = rankUser.id === user?.id;

                          return (
                            <div
                              key={rankUser.id}
                              className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-[1.02] ${
                                position <= 3
                                  ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200'
                                  : 'bg-gray-50 border border-gray-200'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                {position === 1 && <Crown className="w-8 h-8 text-yellow-500" />}
                                {position === 2 && <Medal className="w-8 h-8 text-gray-400" />}
                                {position === 3 && <Award className="w-8 h-8 text-amber-600" />}
                                {position > 3 && (
                                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                                    <span className="text-sm font-bold text-pink-600">#{position}</span>
                                  </div>
                                )}
                              </div>

                              <Avatar className="w-12 h-12 border-2 border-white">
                                <AvatarImage src={rankUser.user?.avatar || (rankUser.avatar ? `/uploads/${rankUser.avatar}` : null)} className="object-cover" />
                                <AvatarFallback>{(rankUser.user?.name || rankUser.name)?.[0] || 'U'}</AvatarFallback>
                              </Avatar>

                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-semibold">{rankUser.user?.name || rankUser.name || 'Usuário'}</h3>
                                  <Badge className={`${userLevelConfig.bgColor} ${userLevelConfig.color} text-xs`}>
                                    <UserLevelIcon className="w-3 h-3 mr-1" />
                                    {userLevelConfig.name}
                                  </Badge>
                                  {rankUser.planType === 'premium' && (
                                    <Badge className="bg-purple-100 text-purple-700 text-xs">Premium</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">{rankUser.totalPoints || 0} pontos</p>
                              </div>

                              <div className="text-right">
                                <div className="font-bold text-lg text-pink-600">#{position}</div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                </div>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="text-center py-8">
                            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhum ranking disponível</h3>
                            <p className="text-gray-500">Aguarde, em breve teremos o ranking das cheirosas!</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab: Missões da Semana */}
                <TabsContent value="missions" className="space-y-6">
                  <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Target className="w-8 h-8 text-purple-500" />
                        Missões Ativas
                      </CardTitle>
                      <CardDescription>
                        Complete missões e ganhe pontos para subir de nível!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {missions.length === 0 ? (
                          <div className="text-center py-8">
                            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma missão ativa</h3>
                            <p className="text-gray-500">Aguarde, em breve teremos missões incríveis para você!</p>
                          </div>
                        ) : (
                          missions.map((mission, index) => {
                            const IconComponent = getIconComponent(mission.icon);
                            const progressPercentage = Math.min((mission.progress / mission.targetCount) * 100, 100);

                            return (
                              <div key={mission.id} className="relative overflow-hidden bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 group">
                                <div className="p-6">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: `${mission.color}20` }}
                                      >
                                        <IconComponent className="w-6 h-6" style={{ color: mission.color }} />
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-gray-900">{mission.title}</h3>
                                        <p className="text-sm text-gray-600">{mission.description}</p>
                                      </div>
                                    </div>

                                    <div className="text-right">
                                      <div className="flex items-center gap-1 text-amber-600 font-semibold">
                                        <Coins className="w-4 h-4" />
                                        <span>{mission.pointsReward}</span>
                                      </div>
                                      {mission.completed && (
                                        <Badge className="mt-1 bg-green-100 text-green-700">
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Completa
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-gray-600">Progresso</span>
                                      <span className="font-medium">{mission.progress}/{mission.targetCount}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="h-2 rounded-full transition-all duration-500"
                                        style={{
                                          width: `${progressPercentage}%`,
                                          backgroundColor: mission.color
                                        }}
                                      />
                                    </div>
                                  </div>

                                  {!mission.completed && mission.progress >= mission.targetCount && (
                                    <Button
                                      onClick={() => completeMissionMutation.mutate(mission.id.toString())}
                                      disabled={completeMissionMutation.isPending}
                                      className="mt-4 w-full bg-green-600 hover:bg-green-700"
                                    >
                                      <Gift className="w-4 h-4 mr-2" />
                                      Resgatar Pontos
                                    </Button>
                                  )}
                                  {!mission.completed && mission.progress < mission.targetCount && (
                                    <Button
                                      disabled
                                      className="mt-4 w-full opacity-50 cursor-not-allowed"
                                      style={{ backgroundColor: mission.color }}
                                    >
                                      <Target className="w-4 h-4 mr-2" />
                                      Completar Missão
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab: Loja de Recompensas */}
                <TabsContent value="rewards" className="space-y-6">
                  <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Gift className="w-8 h-8 text-green-500" />
                        Loja de Recompensas
                      </CardTitle>
                      <CardDescription>
                        Troque seus pontos por recompensas incríveis!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rewards.length === 0 ? (
                          <div className="col-span-full text-center py-8">
                            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhuma recompensa disponível</h3>
                            <p className="text-gray-500">Aguarde, em breve teremos recompensas incríveis para você!</p>
                          </div>
                        ) : (
                          rewards.map((reward) => (
                            <Card key={reward.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                              <div className="aspect-video bg-gradient-to-br from-pink-100 to-purple-100 relative">
                                {reward.imageUrl ? (
                                  <img
                                    src={reward.imageUrl}
                                    alt={reward.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <Gift className="w-16 h-16 text-pink-400" />
                                  </div>
                                )}
                                <Badge className="absolute top-3 right-3 bg-yellow-100 text-yellow-800">
                                  <Coins className="w-3 h-3 mr-1" />
                                  {reward.cost || 0} pts
                                </Badge>
                              </div>
                              <CardContent className="p-4">
                                <h3 className="font-semibold text-lg mb-2">{reward.title || 'Recompensa'}</h3>
                                <p className="text-gray-600 text-sm mb-3">{reward.description || 'Descrição não disponível'}</p>

                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-gray-500">
                                    {reward.stock === -1 ? 'Ilimitado' : `${reward.stock || 0} disponíveis`}
                                  </div>
                                  <Button
                                    onClick={() => redeemRewardMutation.mutate(reward.id.toString())}
                                    disabled={redeemRewardMutation.isPending || (userDisplayData.totalPoints || 0) < reward.cost || reward.stock === 0}
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
                                  >
                                    Resgatar
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab: Sorteios */}
                <TabsContent value="raffles" className="space-y-6">
                  <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Sparkles className="w-8 h-8 text-purple-500" />
                        Sorteios Ativos
                      </CardTitle>
                      <CardDescription>
                        Participe dos sorteios e concorra a prêmios incríveis!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-6">
                        {raffles.length === 0 ? (
                          <Card className="overflow-hidden">
                            <CardContent className="p-8 text-center">
                              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                              <h3 className="text-xl font-semibold text-gray-600 mb-2">Nenhum sorteio ativo</h3>
                              <p className="text-gray-500">Aguarde, em breve teremos sorteios incríveis para você!</p>
                            </CardContent>
                          </Card>
                        ) : (
                          raffles.map((raffle) => (
                            <Card key={raffle.id} className="overflow-hidden">
                              <div className="md:flex">
                                <div className="md:w-1/3 aspect-video md:aspect-square bg-gradient-to-br from-purple-100 to-pink-100 relative">
                                  {raffle.imageUrl ? (
                                    <img
                                      src={raffle.imageUrl}
                                      alt={raffle.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Sparkles className="w-20 h-20 text-purple-400" />
                                    </div>
                                  )}
                                  <Badge className="absolute top-3 right-3 bg-purple-100 text-purple-800">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {new Date(raffle.endDate).toLocaleDateString()}
                                  </Badge>
                                  {raffle.premiumOnly && (
                                    <Badge className="absolute top-3 left-3 bg-yellow-100 text-yellow-800">
                                      <Crown className="w-3 h-3 mr-1" />
                                      Premium
                                    </Badge>
                                  )}
                                </div>
                                <CardContent className="md:w-2/3 p-6">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-bold text-xl">{raffle.title}</h3>
                                    {raffle.category && (
                                      <Badge variant="outline" className="text-xs">
                                        {raffle.category}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-gray-600 mb-3">{raffle.description}</p>
                                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                    <p className="text-sm text-yellow-800">
                                      <strong>Prêmio:</strong> {raffle.prizeDescription}
                                    </p>
                                    {raffle.prizeValue && raffle.prizeValue > 0 && (
                                      <p className="text-xs text-yellow-700 mt-1">
                                        Valor: R$ {typeof raffle.prizeValue === 'number' ? raffle.prizeValue.toFixed(2) : parseFloat(String(raffle.prizeValue) || '0').toFixed(2)}
                                      </p>
                                    )}
                                  </div>

                                  {raffle.sponsorName && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-4">
                                      <p className="text-xs text-blue-800">
                                        <strong>Patrocinado por:</strong> {raffle.sponsorName}
                                      </p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="text-center">
                                      <p className="text-2xl font-bold text-purple-600">{raffle.totalEntries || 0}</p>
                                      <p className="text-sm text-gray-500">Total de participações</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-2xl font-bold text-pink-600">{raffle.entryCost} pts</p>
                                      <p className="text-sm text-gray-500">Por participação</p>
                                    </div>
                                  </div>

                                  {raffle.minLevel && raffle.minLevel !== 'bronze' && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                                      <p className="text-xs text-amber-800">
                                        <strong>Nível mínimo:</strong> {raffle.minLevel}
                                      </p>
                                    </div>
                                  )}

                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => enterRaffleMutation.mutate({ raffleId: raffle.id.toString(), entries: 1 })}
                                      disabled={enterRaffleMutation.isPending || (userDisplayData.totalPoints || 0) < raffle.entryCost}
                                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                                    >
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Participar (1x)
                                    </Button>
                                    <Button
                                      onClick={() => enterRaffleMutation.mutate({ raffleId: raffle.id.toString(), entries: 5 })}
                                      disabled={enterRaffleMutation.isPending || (userDisplayData.totalPoints || 0) < (raffle.entryCost * 5)}
                                      variant="outline"
                                      className="border-purple-200 hover:bg-purple-50"
                                    >
                                      5x
                                    </Button>
                                  </div>
                                </CardContent>
                              </div>
                            </Card>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab: Mural da Fama */}
                <TabsContent value="fame" className="space-y-6">
                  <div className="grid gap-6">
                    {/* Vencedoras Recentes */}
                    <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl">
                          <Star className="w-8 h-8 text-yellow-500" />
                          Mural da Fama
                        </CardTitle>
                        <CardDescription>
                          Celebrando nossas Cheirosas de destaque!
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <div className="relative inline-block">
                            <Avatar className="w-24 h-24 border-4 border-yellow-400">
                              <AvatarImage src="https://ui.shadcn.com/avatars/02.png" />
                              <AvatarFallback>LA</AvatarFallback>
                            </Avatar>
                            <Crown className="w-8 h-8 text-yellow-500 absolute -top-2 -right-2" />
                          </div>
                          <h3 className="text-2xl font-bold mt-4 mb-2">Luciane Admin</h3>
                          <p className="text-lg text-gray-600 mb-4">é a Cheirosa Diamante do mês!</p>
                          <Badge className="bg-yellow-100 text-yellow-800 text-lg px-4 py-2">
                            <Diamond className="w-5 h-5 mr-2" />
                            1.250 pontos
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Últimas Ganhadoras de Sorteios */}
                    <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Trophy className="w-6 h-6 text-purple-500" />
                          Últimas Ganhadoras
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                            <Avatar>
                              <AvatarImage src="https://ui.shadcn.com/avatars/03.png" />
                              <AvatarFallback>AC</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold">Ana Carolina</h4>
                              <p className="text-sm text-gray-600">Ganhou: Kit Completo de Beleza</p>
                            </div>
                            <Badge className="bg-purple-100 text-purple-700">Há 2 dias</Badge>
                          </div>

                          <div className="flex items-center gap-4 p-4 bg-pink-50 rounded-lg">
                            <Avatar>
                              <AvatarImage src="https://ui.shadcn.com/avatars/04.png" />
                              <AvatarFallback>FL</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-semibold">Fernanda Lima</h4>
                              <p className="text-sm text-gray-600">Ganhou: Perfume Importado</p>
                            </div>
                            <Badge className="bg-pink-100 text-pink-700">Há 1 semana</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Tab: Saiba Mais */}
                <TabsContent value="guide" className="space-y-6">
                  <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-2xl">
                        <Info className="w-8 h-8 text-blue-500" />
                        Como Funciona o Sistema Cheirosas
                      </CardTitle>
                      <CardDescription>
                        Entenda tudo sobre pontos, níveis, missões e recompensas!
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">

                      {/* Como Ganhar Pontos */}
                      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <Coins className="w-6 h-6 text-yellow-500" />
                          Como Ganhar Pontos
                        </h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                            <Eye className="w-5 h-5 text-blue-500" />
                            <div>
                              <p className="font-medium">Assistir Vídeos</p>
                              <p className="text-sm text-gray-600">5-10 pontos por vídeo completo</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                            <MessageCircle className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="font-medium">Comentar</p>
                              <p className="text-sm text-gray-600">3-5 pontos por comentário</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                            <Download className="w-5 h-5 text-purple-500" />
                            <div>
                              <p className="font-medium">Baixar Produtos</p>
                              <p className="text-sm text-gray-600">8-15 pontos por download</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                            <Target className="w-5 h-5 text-pink-500" />
                            <div>
                              <p className="font-medium">Completar Missões</p>
                              <p className="text-sm text-gray-600">10-50 pontos por missão</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                            <Share2 className="w-5 h-5 text-green-500" />
                            <div>
                              <p className="font-medium">Compartilhar Conteúdo</p>
                              <p className="text-sm text-gray-600">10-15 pontos por compartilhamento</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                            <UserPlus className="w-5 h-5 text-amber-500" />
                            <div>
                              <p className="font-medium">Convidar Amigas</p>
                              <p className="text-sm text-gray-600">25-100 pontos por convite aceito</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sistema de Níveis */}
                      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-lg border border-yellow-200">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <TrendingUp className="w-6 h-6 text-amber-500" />
                          Sistema de Níveis
                        </h3>
                        <p className="text-gray-700 mb-4">
                          Conforme você acumula pontos, você sobe de nível e desbloqueia benefícios exclusivos!
                        </p>
                        <div className="grid gap-4">
                          <div className="flex items-center gap-4 p-4 bg-white/60 rounded-lg border border-amber-200">
                            <Medal className="w-8 h-8 text-amber-600" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">Bronze (0-99 pontos)</h4>
                              <p className="text-sm text-gray-600">Nível inicial - Acesso básico às funcionalidades</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-white/60 rounded-lg border border-gray-300">
                            <Award className="w-8 h-8 text-gray-600" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">Prata (100-499 pontos)</h4>
                              <p className="text-sm text-gray-600">Descontos especiais + Acesso a sorteios básicos</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-white/60 rounded-lg border border-yellow-300">
                            <Crown className="w-8 h-8 text-yellow-500" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">Ouro (500-1499 pontos)</h4>
                              <p className="text-sm text-gray-600">Recompensas premium + Sorteios exclusivos + Consultoria</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex items-center gap-4 p-4 bg-white/60 rounded-lg border border-blue-300">
                            <Diamond className="w-8 h-8 text-blue-500" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">Diamante (1500+ pontos)</h4>
                              <p className="text-sm text-gray-600">Acesso VIP + Produtos exclusivos + Eventos especiais</p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </div>
                      </div>

                      {/* Ranking e Competição */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <Trophy className="w-6 h-6 text-blue-500" />
                          Ranking e Competição
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <p className="text-gray-700"><strong>Atualização semanal:</strong> O ranking é renovado toda segunda-feira</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <p className="text-gray-700"><strong>TOP 3:</strong> Ganham recompensas especiais e destaque no Mural da Fama</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <p className="text-gray-700"><strong>Critérios:</strong> Pontos acumulados + engajamento + missões completadas</p>
                          </div>
                        </div>
                      </div>

                      {/* Missões */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <Target className="w-6 h-6 text-green-500" />
                          Sistema de Missões
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Gamepad2 className="w-5 h-5 text-green-500" />
                              Tipos de Missões
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li>• <strong>Diárias:</strong> Renovam todo dia (5-15 pontos)</li>
                              <li>• <strong>Semanais:</strong> Mais desafiadoras (20-50 pontos)</li>
                              <li>• <strong>Especiais:</strong> Eventos e datas comemorativas</li>
                              <li>• <strong>Conquistas:</strong> Marcos únicos e permanentes</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <Lightbulb className="w-5 h-5 text-yellow-500" />
                              Dicas Importantes
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li>• Foque nas missões de maior pontuação</li>
                              <li>• Missões em grupo dão bônus extra</li>
                              <li>• Complete sequências para multiplicadores</li>
                              <li>• Algumas missões têm tempo limitado</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Loja de Recompensas */}
                      <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-6 rounded-lg border border-pink-200">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <ShoppingBag className="w-6 h-6 text-pink-500" />
                          Loja de Recompensas
                        </h3>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-white/50 rounded-lg">
                            <Gift className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                            <h4 className="font-semibold">Produtos Físicos</h4>
                            <p className="text-sm text-gray-600">Amostras, kits e cosméticos</p>
                          </div>
                          <div className="text-center p-4 bg-white/50 rounded-lg">
                            <Tag className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                            <h4 className="font-semibold">Cupons e Descontos</h4>
                            <p className="text-sm text-gray-600">5% a 30% OFF em produtos</p>
                          </div>
                          <div className="text-center p-4 bg-white/50 rounded-lg">
                            <Crown className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <h4 className="font-semibold">Experiências VIP</h4>
                            <p className="text-sm text-gray-600">Consultoria e conteúdo exclusivo</p>
                          </div>
                        </div>
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>💡 Dica:</strong> Produtos com estoque limitado aparecem primeiro! Fique de olho nas novidades.
                          </p>
                        </div>
                      </div>

                      {/* Compartilhamento e Convites */}
                      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-lg border border-orange-200">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <UserPlus className="w-6 h-6 text-orange-500" />
                          Compartilhamento e Programa de Indicação
                        </h3>
                        <p className="text-gray-700 mb-4">
                          <strong>Uma das formas mais eficazes</strong> de ganhar pontos é compartilhando conteúdo e convidando amigas!
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3 text-indigo-700">🎯 Meta Mensal de Compartilhamento</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li>• <strong>10-15 pontos</strong> por vídeo/produto compartilhado</li>
                              <li>• Compartilhe no Instagram, Facebook, WhatsApp</li>
                              <li>• Marque amigas nos comentários</li>
                              <li>• Use as hashtags sugeridas</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3 text-indigo-700">🏆 Embaixadora do Mês</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li>• <strong>25 pontos</strong> quando uma amiga se cadastra</li>
                              <li>• <strong>50 pontos</strong> extras quando ela faz primeira compra</li>
                              <li>• <strong>Bônus progressivo:</strong> 5+ indicações = multiplicador</li>
                              <li>• Sua amiga também ganha pontos de boas-vindas!</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-6 grid md:grid-cols-2 gap-4">
                          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h5 className="font-semibold text-green-800 mb-2">🎯 Meta Mensal de Compartilhamento</h5>
                            <p className="text-sm text-green-700">
                              Compartilhe 15 conteúdos no mês e ganhe <strong>100 pontos bônus</strong>!
                            </p>
                          </div>
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <h5 className="font-semibold text-amber-800 mb-2">🏆 Embaixadora do Mês</h5>
                            <p className="text-sm text-amber-700">
                              Traga 10+ amigas e ganhe <strong>500 pontos</strong> + título especial!
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Sorteios */}
                      <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-lg border border-purple-200">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <Sparkles className="w-6 h-6 text-purple-500" />
                          Sistema de Sorteios
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-purple-500 mt-1" />
                            <div>
                              <h4 className="font-semibold">Como Participar</h4>
                              <p className="text-sm text-gray-700">Use seus pontos para comprar participações (números da sorte)</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-blue-500 mt-1" />
                            <div>
                              <h4 className="font-semibold">Quando Acontece</h4>
                              <p className="text-sm text-gray-700">Sorteios mensais e especiais em datas comemorativas</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <Trophy className="w-5 h-5 text-yellow-500 mt-1" />
                            <div>
                              <h4 className="font-semibold">Prêmios</h4>
                              <p className="text-sm text-gray-700">Kits de beleza, produtos premium, experiências exclusivas</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <p className="text-sm text-purple-800">
                            <strong>✨ Estratégia:</strong> Mais participações = mais chances! Níveis superiores têm descontos especiais.
                          </p>
                        </div>
                      </div>

                      {/* Mural da Fama */}
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border border-yellow-300">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <Star className="w-6 h-6 text-yellow-500" />
                          Mural da Fama
                        </h3>
                        <div className="space-y-3">
                          <p className="text-gray-700">
                            <strong>Reconhecimento especial</strong> para as Cheirosas que se destacam!
                          </p>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3">
                              <Crown className="w-6 h-6 text-yellow-500" />
                              <div>
                                <h4 className="font-semibold">Cheirosa do Mês</h4>
                                <p className="text-sm text-gray-600">Maior pontuação mensal</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Heart className="w-6 h-6 text-pink-500" />
                              <div>
                                <h4 className="font-semibold">Mais Engajada</h4>
                                <p className="text-sm text-gray-600">Participação ativa na comunidade</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Trophy className="w-6 h-6 text-purple-500" />
                              <div>
                                <h4 className="font-semibold">Ganhadoras de Sorteios</h4>
                                <p className="text-sm text-gray-600">Últimas contempladas</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Flame className="w-6 h-6 text-orange-500" />
                              <div>
                                <h4 className="font-semibold">Em Destaque</h4>
                                <p className="text-sm text-gray-600">Conquistas especiais</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Dicas Finais */}
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-lg border border-indigo-200">
                        <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                          <Lightbulb className="w-6 h-6 text-indigo-500" />
                          Dicas para Maximizar seus Pontos
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3 text-indigo-700">📈 Estratégias Eficientes</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li>• Assista vídeos completos (não pule!)</li>
                              <li>• Comente de forma construtiva</li>
                              <li>• Complete missões em sequência</li>
                              <li>• Participe regularmente (consistência conta!)</li>
                              <li>• Compartilhe conteúdos nas suas redes sociais</li>
                              <li>• Convide amigas para multiplicar seus pontos</li>
                              <li>• Aproveite eventos especiais</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3 text-indigo-700">🎯 Foco nas Recompensas</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li>• Planeje suas trocas de pontos</li>
                              <li>• Acompanhe produtos com estoque limitado</li>
                              <li>• Invista em sorteios estrategicamente</li>
                              <li>• Acompanhe o ranking semanal</li>
                              <li>• Use o programa de indicação para ganhar muito mais</li>
                              <li>• Interaja com outras Cheirosas</li>
                            </ul>
                          </div>
                        </div>
                        <div className="mt-6 p-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg border border-pink-200">
                          <p className="text-center text-gray-800 font-medium">
                            💖 <strong>Lembre-se:</strong> O sistema Cheirosas foi criado para recompensar sua paixão por beleza e sua participação na nossa comunidade. Divirta-se e aproveite cada conquista!
                          </p>
                        </div>
                      </div>

                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
      </main>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        url={`${window.location.origin}/auth?ref=${user?.id || 'user123'}`}
        title="Beleza com Luci - Sistema Cheirosas"
        description="Olha que incrível! Descobri um app de beleza com sistema de recompensas. Você ganha pontos assistindo vídeos, pode trocar por produtos e ainda concorrer a sorteios! 💄✨ Se cadastre pelo meu link e comece a ganhar pontos!"
      />
    </div>
  );
}

// Helper functions (getLevelConfig and getIconComponent remain the same)
const getLevelConfig = (level: string) => {
  const configs = {
    bronze: { icon: Medal, color: "text-amber-600", bgColor: "bg-amber-100", name: "Bronze", pointsRequired: 0, nextLevel: 100 },
    silver: { icon: Award, color: "text-gray-600", bgColor: "bg-gray-100", name: "Prata", pointsRequired: 100, nextLevel: 500 },
    gold: { icon: Crown, color: "text-yellow-500", bgColor: "bg-yellow-100", name: "Ouro", pointsRequired: 500, nextLevel: 1500 },
    diamond: { icon: Diamond, color: "text-blue-500", bgColor: "bg-blue-100", name: "Diamante", pointsRequired: 1500, nextLevel: 9999 }
  };
  return configs[level as keyof typeof configs] || configs.bronze;
};

const getIconComponent = (iconName: string) => {
  const icons: { [key: string]: any } = {
    'play': Eye,
    'message-circle': MessageCircle,
    'tag': Tag,
    'download': Download,
    'zap': Zap,
    'star': Star,
    'heart': Heart,
    'trophy': Trophy,
    'gift': Gift,
    'share': Share2,
    'user-plus': UserPlus,
    'users': Users
  };
  return icons[iconName] || Star;
};