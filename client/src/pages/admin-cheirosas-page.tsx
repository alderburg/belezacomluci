import { useState, useEffect } from "react";
import { flushSync } from "react-dom";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import Sidebar from "@/components/sidebar";
import { 
  Settings,
  Users,
  Target,
  Trophy,
  Gift,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  Medal,
  Crown,
  Diamond,
  Coins,
  Calendar,
  Package,
  Image,
  Save,
  Eye,
  EyeOff,
  BarChart3,
  UserPlus,
  Award,
  Search,
  Filter,
  Shield,
  Palette,
  Share2,
  Sparkles,
  X,
  Play,
  Heart,
  MessageCircle,
  Download,
  Tag,
  Star,
  Zap
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  planType: 'free' | 'premium';
  totalPoints: number;
  freeReferrals: number;
  premiumReferrals: number;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  pointsReward: number;
  missionType: string; // 'daily', 'weekly', 'monthly', 'achievement', 'permanent'
  actionRequired: string; // 'video_watched', 'video_liked', 'video_commented', etc.
  targetCount: number;
  icon: string;
  color: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  // Novos campos para controle avançado
  minLevel?: string; // 'bronze', 'silver', 'gold', 'diamond'
  premiumOnly?: boolean;
  minPoints?: number;
  usageLimit?: number; // -1 para ilimitado
}

interface Raffle {
  id: string;
  title: string;
  description: string;
  prizeDescription: string;
  imageUrl?: string;
  entryCost: number;
  maxEntriesPerUser: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalEntries: number;
  // Campos avançados
  premiumOnly?: boolean;
  minLevel?: string; // 'bronze', 'silver', 'gold', 'diamond'
  minPoints?: number;
  maxParticipants?: number; // limite total de participantes
  drawDate?: string; // data do sorteio
  winnerCount?: number; // quantos vencedores
  category?: string; // categoria do sorteio
  rules?: string; // regras detalhadas
  sponsorName?: string; // nome do patrocinador
  sponsorLogo?: string; // logo do patrocinador
  prizeValue?: number; // valor do prêmio em reais
}

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  rewardType: string;
  imageUrl?: string;
  stockQuantity: number;
  isActive: boolean;
}

interface ShareSettings {
  freeReferralPoints: number;
  premiumReferralPoints: number;
}

// Helper function to render icons dynamically
const renderIcon = (iconName: string, className: string = "w-6 h-6", style?: React.CSSProperties) => {
  const iconMap: Record<string, React.ComponentType<any>> = {
    'play': Play,
    'heart': Heart,
    'message-circle': MessageCircle,
    'share-2': Share2,
    'download': Download,
    'tag': Tag,
    'users': Users,
    'target': Target,
    'star': Star,
    'gift': Gift,
    'zap': Zap,
    'trophy': Trophy
  };

  const IconComponent = iconMap[iconName] || Target;
  return <IconComponent className={className} style={style} />;
};

// Helper function to translate mission types to Portuguese
const getMissionTypeLabel = (missionType: string) => {
  const typeMap: Record<string, string> = {
    'achievement': '🏆 Conquista',
    'daily': '📅 Diária',
    'weekly': '📆 Semanal',
    'monthly': '🗓️ Mensal',
    'permanent': '♾️ Permanente'
  };

  return typeMap[missionType] || missionType;
};

// Helper function to translate action required to Portuguese
const getActionRequiredLabel = (actionRequired: string) => {
  const actionMap: Record<string, string> = {
    'video_watched': '🎥 Assistir Vídeos',
    'video_liked': '❤️ Curtir Vídeos',
    'video_commented': '💬 Comentar Vídeos',
    'video_shared': '📤 Compartilhar Vídeos',
    'product_downloaded': '⬇️ Baixar Produtos',
    'product_shared': '📋 Compartilhar Produtos',
    'product_commented': '💭 Comentar Produtos',
    'coupon_used': '🎫 Usar Cupons',
    'referral_used': '👥 Indicar Usuários',
    'login_streak': '🔥 Sequência de Logins',
    'profile_updated': '👤 Atualizar Perfil',
    'mission_completed': '✅ Completar Missões',
    'reward_redeemed': '🎁 Resgatar Recompensas',
    'raffle_entered': '🎰 Participar Sorteios'
  };

  return actionMap[actionRequired] || actionRequired;
};

// Helper function to translate level to Portuguese
const getLevelLabel = (level: string) => {
  const levelMap: Record<string, string> = {
    'bronze': '🥉 Bronze',
    'silver': '🥈 Silver', 
    'gold': '🥇 Gold',
    'diamond': '💎 Diamond'
  };

  return levelMap[level] || level;
};

export default function AdminCheirosasPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("shares");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false); // Adicionado para o estado de salvamento

  // Estados para gerenciamento
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    freeReferralPoints: 25,
    premiumReferralPoints: 50
  });
  const [topUsers, setTopUsers] = useState<User[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);

  // Estados para formulários
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [editingRaffle, setEditingRaffle] = useState<Raffle | null>(null);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Estados para salvamento
  const [savingRaffle, setSavingRaffle] = useState(false);
  const [savingMission, setSavingMission] = useState(false);
  const [savingReward, setSavingReward] = useState(false);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados para confirmação de exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: 'mission' | 'raffle' | 'reward';
    id: string;
    title: string;
  } | null>(null);

  // Estados para pesquisa e filtro
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Verificar se é admin
  useEffect(() => {
    if (!user?.isAdmin) {
      window.location.href = '/';
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar configurações de compartilhamento do backend
      try {
        const settingsResponse = await fetch('/api/admin/share-settings');
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json();
          setShareSettings({
            freeReferralPoints: settings.freeReferralPoints || 25,
            premiumReferralPoints: settings.premiumReferralPoints || 50
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
      }

      // Carregar usuários com dados de referral do backend
      try {
        const usersResponse = await fetch('/api/admin/users-with-referrals');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          // Transformar os dados para o formato esperado pelo componente
          const formattedUsers = usersData.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            planType: user.planType,
            totalPoints: user.totalPoints || 0,
            freeReferrals: user.freeReferrals || 0,
            premiumReferrals: user.premiumReferrals || 0
          }));
          setAllUsers(formattedUsers);
          setTopUsers(formattedUsers.slice(0, 10));
        } else {
          console.error('Erro ao carregar usuários:', response.statusText);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados dos usuários.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        toast({
          title: "Erro",
          description: "Erro de conexão ao carregar usuários.",
          variant: "destructive"
        });
      }

      // Carregar missões da API admin
      try {
        const missionsResponse = await fetch('/api/admin/missions');
        if (missionsResponse.ok) {
          const missionsData = await missionsResponse.json();
          setMissions(missionsData.missions.map((mission: any) => ({
            ...mission,
            minLevel: mission.minLevel || 'bronze',
            premiumOnly: mission.premiumOnly || false,
            minPoints: mission.minPoints || 0,
            usageLimit: mission.usageLimit || -1
          })));
        } else {
          console.error('Erro ao carregar missões:', response.statusText);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as missões.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Erro ao carregar missões:', error);
        toast({
          title: "Erro",
          description: "Erro de conexão ao carregar missões.",
          variant: "destructive"
        });
      }

      // Carregar sorteios da API admin
      try {
        const rafflesResponse = await fetch('/api/admin/raffles');
        if (rafflesResponse.ok) {
          const rafflesData = await rafflesResponse.json();
          setRaffles(rafflesData.raffles.map((raffle: any) => ({
            ...raffle,
            startDate: raffle.startDate ? new Date(raffle.startDate).toISOString().split('T')[0] : '',
            endDate: raffle.endDate ? new Date(raffle.endDate).toISOString().split('T')[0] : '',
            drawDate: raffle.drawDate ? new Date(raffle.drawDate).toISOString().split('T')[0] : '',
            prizeValue: parseFloat(raffle.prizeValue || 0)
          })));
        } else {
          console.error('Erro ao carregar sorteios:', response.statusText);
          toast({
            title: "Erro",
            description: "Não foi possível carregar os sorteios.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Erro ao carregar sorteios:', error);
        toast({
          title: "Erro",
          description: "Erro de conexão ao carregar sorteios.",
          variant: "destructive"
        });
      }

      // Carregar recompensas da API admin
      try {
        const rewardsResponse = await fetch('/api/admin/rewards');
        if (rewardsResponse.ok) {
          const rewardsData = await rewardsResponse.json();
          setRewards(rewardsData.rewards);
        } else {
          console.error('Erro ao carregar recompensas:', response.statusText);
          toast({
            title: "Erro",
            description: "Não foi possível carregar as recompensas.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Erro ao carregar recompensas:', error);
        toast({
          title: "Erro",
          description: "Erro de conexão ao carregar recompensas.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateShareSettings = async () => {
    try {
      setSavingSettings(true);

      const response = await fetch('/api/admin/share-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          freeReferralPoints: shareSettings.freeReferralPoints,
          premiumReferralPoints: shareSettings.premiumReferralPoints
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao atualizar configurações');
      }

      const updatedSettings = await response.json();

      // Atualizar o estado local com os dados retornados
      setShareSettings({
        freeReferralPoints: updatedSettings[0]?.freeReferralPoints || shareSettings.freeReferralPoints,
        premiumReferralPoints: updatedSettings[0]?.premiumReferralPoints || shareSettings.premiumReferralPoints
      });

      // Mostrar feedback de sucesso
      toast({
        title: "Sucesso!",
        description: "Configurações de compartilhamento atualizadas com sucesso.",
      });

    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  // Função para filtrar e buscar usuários
  const getFilteredUsers = () => {
    let filteredUsers = allUsers;

    // Aplicar filtro por tipo de plano
    if (planFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user => user.planType === planFilter);
    }

    // Aplicar pesquisa por nome ou email
    if (searchTerm.trim()) {
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar por total de pontos (descendente)
    filteredUsers.sort((a, b) => b.totalPoints - a.totalPoints);

    // Se não há pesquisa, mostrar apenas top 10
    if (!searchTerm.trim()) {
      filteredUsers = filteredUsers.slice(0, 10);
    }

    return filteredUsers;
  };

  const getDisplayTitle = () => {
    if (searchTerm.trim()) {
      return `Resultados da pesquisa: "${searchTerm}"`;
    }

    switch (planFilter) {
      case 'free':
        return 'TOP 10 Usuários Free que Mais Compartilharam';
      case 'premium':
        return 'TOP 10 Usuários Premium que Mais Compartilharam';
      default:
        return 'TOP 10 Usuários que Mais Compartilharam (Geral)';
    }
  };

  const saveMission = async (missionData: Partial<Mission>) => {
    try {
      setSavingMission(true);

      // Fazer chamada real para a API
      const response = await fetch('/api/admin/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(missionData)
      });

      if (response.ok) {
        const savedMission = await response.json();

        // Atualizar a lista local de missões
        if (missionData.id && !missionData.id.startsWith('mission_')) {
          // Editando missão existente
          setMissions(prev => prev.map(mission => 
            mission.id === missionData.id ? savedMission : mission
          ));
        } else {
          // Criando nova missão
          setMissions(prev => [savedMission, ...prev]);
        }

        // Mostrar toast de sucesso
        toast({
          title: "Sucesso!",
          description: missionData.id && !missionData.id.startsWith('mission_') ? "Missão atualizada com sucesso!" : "Nova missão criada com sucesso!",
        });

        // Fechar modal
        setEditingMission(null);
      } else {
        throw new Error('Erro ao salvar missão');
      }

    } catch (error) {
      console.error('Erro ao salvar missão:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar missão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingMission(false);
    }
  };

  const saveRaffle = async (raffleData: Partial<Raffle>) => {
    try {
      setSavingRaffle(true);

      // Fazer chamada real para a API
      const response = await fetch('/api/admin/raffles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(raffleData)
      });

      if (response.ok) {
        const savedRaffle = await response.json();

        // Atualizar a lista local de sorteios
        if (raffleData.id && !raffleData.id.startsWith('raffle_')) {
          // Editando sorteio existente
          setRaffles(prev => prev.map(raffle => 
            raffle.id === raffleData.id ? savedRaffle : raffle
          ));
        } else {
          // Criando novo sorteio
          setRaffles(prev => [savedRaffle, ...prev]);
        }

        // Mostrar toast de sucesso
        toast({
          title: "Sucesso!",
          description: raffleData.id && !raffleData.id.startsWith('raffle_') ? "Sorteio atualizado com sucesso!" : "Novo sorteio criado com sucesso!",
        });

        // Fechar modal
        setEditingRaffle(null);
      } else {
        throw new Error('Erro ao salvar sorteio');
      }

    } catch (error) {
      console.error('Erro ao salvar sorteio:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar sorteio. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingRaffle(false);
    }
  };

  const saveReward = async (rewardData: Partial<Reward>) => {
    try {
      setSavingReward(true);

      // Fazer chamada real para a API
      const response = await fetch('/api/admin/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rewardData)
      });

      if (response.ok) {
        const savedReward = await response.json();

        // Atualizar a lista local de recompensas
        if (rewardData.id && !rewardData.id.startsWith('reward_')) {
          // Editando recompensa existente
          setRewards(prev => prev.map(reward => 
            reward.id === rewardData.id ? savedReward : reward
          ));
        } else {
          // Criando nova recompensa
          setRewards(prev => [savedReward, ...prev]);
        }

        // Mostrar toast de sucesso
        toast({
          title: "Sucesso!",
          description: rewardData.id && !rewardData.id.startsWith('reward_') ? "Recompensa atualizada com sucesso!" : "Nova recompensa criada com sucesso!",
        });

        // Fechar modal
        setEditingReward(null);
      } else {
        throw new Error('Erro ao salvar recompensa');
      }

    } catch (error) {
      console.error('Erro ao salvar recompensa:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar recompensa. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingReward(false);
    }
  };

  const confirmDelete = (type: 'mission' | 'raffle' | 'reward', id: string, title: string) => {
    // Prevenir múltiplas exclusões simultâneas
    if (deletingId) {
      return;
    }
    setDeleteConfirm({ open: true, type, id, title });
  };

  const handleDelete = async () => {
    if (!deleteConfirm || deletingId) return;

    setDeletingItem(true);
    setDeletingId(deleteConfirm.id);

    try {
      let response;

      if (deleteConfirm.type === 'mission') {
        response = await fetch(`/api/admin/missions/${deleteConfirm.id}`, { method: 'DELETE' });
      } else if (deleteConfirm.type === 'raffle') {
        response = await fetch(`/api/admin/raffles/${deleteConfirm.id}`, { method: 'DELETE' });
      } else if (deleteConfirm.type === 'reward') {
        response = await fetch(`/api/admin/rewards/${deleteConfirm.id}`, { method: 'DELETE' });
      }

      if (response && response.ok) {
        // Atualizar estado usando flushSync para garantir atualização síncrona
        flushSync(() => {
          if (deleteConfirm.type === 'mission') {
            setMissions(prev => prev.filter(m => m.id !== deleteConfirm.id));
          } else if (deleteConfirm.type === 'raffle') {
            setRaffles(prev => prev.filter(r => r.id !== deleteConfirm.id));
          } else if (deleteConfirm.type === 'reward') {
            setRewards(prev => prev.filter(r => r.id !== deleteConfirm.id));
          }
        });

        // Verificação determinística: aguardar até o elemento sair do DOM
        const waitForElementRemoval = () => {
          return new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              const element = document.querySelector(`[data-row-id="${deleteConfirm.id}"]`);
              if (!element) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 10); // Verificar a cada 10ms

            // Timeout de segurança (5 segundos)
            setTimeout(() => {
              clearInterval(checkInterval);
              resolve();
            }, 5000);
          });
        };

        // Aguardar até o elemento ser removido do DOM
        await waitForElementRemoval();

        toast({
          title: "Sucesso!",
          description: `${deleteConfirm.type === 'mission' ? 'Missão' : deleteConfirm.type === 'raffle' ? 'Sorteio' : 'Recompensa'} excluída com sucesso.`,
        });

        // Fechar modal apenas após confirmação visual
        setDeletingItem(false);
        setDeletingId(null);
        setDeleteConfirm(null);
      } else {
        throw new Error('Erro ao excluir item');
      }

    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir. Tente novamente.",
        variant: "destructive",
      });
      setDeletingItem(false);
      setDeletingId(null);
    }
  };

  // As funções deleteRaffle e deleteReward foram substituídas pela função unificada handleDelete

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-6 text-center">
            <Trophy className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Esta página é exclusiva para administradores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">
        <Sidebar />

        <main className={`flex-1 transition-all duration-300 overflow-x-hidden ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
          {/* Header da Página */}
          <div className="bg-white dark:bg-gray-800 border-b">
            <div className="container mx-auto px-6 py-12">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full">
                    <Skeleton className="w-12 h-12 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-10 w-80 mx-auto mb-4" />
                <Skeleton className="h-6 w-64 mx-auto" />
              </div>
            </div>
          </div>

          {/* Skeleton do Conteúdo */}
          <div className="container mx-auto px-6 py-8">
            <div className="grid w-full grid-cols-4 mb-8 bg-white dark:bg-gray-800 rounded-lg p-1 border">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 border rounded-lg p-6">
                <Skeleton className="h-6 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-4" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 border rounded-lg p-6">
                <Skeleton className="h-6 mb-4" />
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/20 border">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 overflow-x-hidden ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        {/* Header da Página */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 dark:from-purple-900 dark:via-pink-900 dark:to-red-900">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative container mx-auto px-6 py-12">
            <div className="text-center text-white">
              <div className="flex justify-center mb-4">
                <div className="bg-white/20 p-4 rounded-full">
                  <Settings className="w-12 h-12" />
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-4">Gerenciamento Cheirosas</h1>
              <p className="text-white/90 text-lg">
                Painel administrativo para controlar todo o sistema de gamificação
              </p>
            </div>
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="container mx-auto px-6 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8 bg-white/70 backdrop-blur-sm">
              <TabsTrigger value="shares" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                {!isMobile && "Compartilhamentos"}
              </TabsTrigger>
              <TabsTrigger value="missions" className="flex items-center gap-2">
                <Target className="w-4 h-4" />
                {!isMobile && "Missões"}
              </TabsTrigger>
              <TabsTrigger value="raffles" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {!isMobile && "Sorteios"}
              </TabsTrigger>
              <TabsTrigger value="rewards" className="flex items-center gap-2">
                <Gift className="w-4 h-4" />
                {!isMobile && "Loja de Resgates"}
              </TabsTrigger>
            </TabsList>

            {/* Aba: Compartilhamentos */}
            <TabsContent value="shares" className="space-y-6">
              {/* Configurações de Pontos */}
              <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-6 h-6 text-blue-500" />
                    Configurações de Pontos
                  </CardTitle>
                  <CardDescription>
                    Defina quantos pontos vale cada tipo de cadastro
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="freePoints">Pontos por Cadastro Free</Label>
                      <Input
                        id="freePoints"
                        type="number"
                        value={shareSettings.freeReferralPoints}
                        onChange={(e) => setShareSettings(prev => ({
                          ...prev,
                          freeReferralPoints: parseInt(e.target.value) || 0
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="premiumPoints">Pontos por Cadastro Premium</Label>
                      <Input
                        id="premiumPoints"
                        type="number"
                        value={shareSettings.premiumReferralPoints}
                        onChange={(e) => setShareSettings(prev => ({
                          ...prev,
                          premiumReferralPoints: parseInt(e.target.value) || 0
                        }))}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={updateShareSettings} 
                    className="w-full"
                    disabled={savingSettings}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingSettings ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </CardContent>
              </Card>

              {/* Ranking de Usuários */}
              <Card className="bg-white/80 backdrop-blur-sm border-pink-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-6 h-6 text-green-500" />
                    {getDisplayTitle()}
                  </CardTitle>
                  <CardDescription>
                    {searchTerm.trim() ? 'Pesquise por nome ou email' : 'Ranking dos usuários com mais indicações'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Controles de Pesquisa e Filtro */}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Pesquisar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-500" />
                      <Select value={planFilter} onValueChange={(value: 'all' | 'free' | 'premium') => setPlanFilter(value)}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Planos</SelectItem>
                          <SelectItem value="free">Apenas Free</SelectItem>
                          <SelectItem value="premium">Apenas Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Lista de Usuários */}
                  <div className="space-y-4">
                    {getFilteredUsers().map((user, index) => {
                      // Calcular posição real no ranking geral
                      const globalPosition = allUsers
                        .filter(u => planFilter === 'all' || u.planType === planFilter)
                        .sort((a, b) => b.totalPoints - a.totalPoints)
                        .findIndex(u => u.id === user.id) + 1;

                      return (
                        <div key={user.id} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border">
                          <div className="flex items-center gap-3 min-w-[80px]">
                            {globalPosition === 1 && <Crown className="w-6 h-6 text-yellow-500" />}
                            {globalPosition === 2 && <Medal className="w-6 h-6 text-gray-400" />}
                            {globalPosition === 3 && <Award className="w-6 h-6 text-amber-600" />}
                            <div className="flex flex-col items-center">
                              <span className="text-lg font-bold text-gray-700">#{globalPosition}</span>
                              {globalPosition <= 3 && (
                                <span className="text-xs text-gray-500">
                                  {globalPosition === 1 ? '🥇' : globalPosition === 2 ? '🥈' : '🥉'}
                                </span>
                              )}
                            </div>
                          </div>

                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                          </Avatar>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{user.name}</h3>
                              <Badge className={user.planType === 'premium' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                                {user.planType === 'premium' ? 'Premium' : 'Free'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>

                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-2">
                              <UserPlus className="w-4 h-4 text-blue-500" />
                              <span className="text-sm">{user.freeReferrals} Free</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4 text-purple-500" />
                              <span className="text-sm">{user.premiumReferrals} Premium</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-semibold">{user.freeReferrals + user.premiumReferrals} Total</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Coins className="w-4 h-4 text-yellow-500" />
                              <span className="font-bold">{user.totalPoints} pts</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {getFilteredUsers().length === 0 && (
                      <div className="text-center py-8">
                        <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Nenhum usuário encontrado com os critérios de pesquisa.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba: Missões */}
            <TabsContent value="missions" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gerenciar Missões</h2>
                <Button 
                  onClick={() => setEditingMission({
                    id: 'mission_new',
                    title: '',
                    description: '',
                    pointsReward: 10,
                    missionType: 'achievement',
                    actionRequired: 'video_watched',
                    targetCount: 1,
                    icon: 'target',
                    color: '#ff6b9d',
                    isActive: true,
                    startDate: undefined,
                    endDate: undefined,
                    minLevel: 'bronze',
                    premiumOnly: false,
                    minPoints: 0,
                    usageLimit: 0
                  })}
                  className="bg-gradient-to-r from-pink-500 to-purple-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Missão
                </Button>
              </div>

              {missions.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma missão cadastrada. Crie a primeira missão para começar!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {missions.map((mission) => (
                    <Card key={mission.id} data-row-id={mission.id} className="bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${mission.color}20` }}
                              >
                                {renderIcon(mission.icon, "w-5 h-5", { color: mission.color })}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{mission.title}</h3>
                                <p className="text-gray-600">{mission.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Recompensa: {mission.pointsReward} pontos</span>
                              <span>Tipo: {getMissionTypeLabel(mission.missionType)}</span>
                              <span>Meta: {mission.targetCount}x</span>
                              <span>Nível: {getLevelLabel(mission.minLevel || 'bronze')}+</span>
                              {mission.premiumOnly && <span className="text-amber-600">Premium</span>}
                              <Badge className={mission.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {mission.isActive ? 'Ativa' : 'Inativa'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingMission(mission)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => confirmDelete('mission', mission.id, mission.title)}
                              disabled={!!deletingId}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba: Sorteios */}
            <TabsContent value="raffles" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gerenciar Sorteios</h2>
                <Button 
                  onClick={() => setEditingRaffle({
                    id: 'raffle_new',
                    title: '',
                    description: '',
                    prizeDescription: '',
                    entryCost: 5,
                    maxEntriesPerUser: 10,
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    isActive: true,
                    totalEntries: 0
                  })}
                  className="bg-gradient-to-r from-yellow-500 to-orange-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Sorteio
                </Button>
              </div>

              {raffles.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum sorteio cadastrado. Crie o primeiro sorteio para engajar suas usuárias!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {raffles.map((raffle) => (
                    <Card key={raffle.id} data-row-id={raffle.id} className="bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          {/* Imagem à esquerda */}
                          <div className="w-32 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-yellow-100 to-orange-100 self-start">
                            {raffle.imageUrl ? (
                              <img 
                                src={raffle.imageUrl} 
                                alt={raffle.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling!.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="w-full h-full flex items-center justify-center"
                              style={{ display: raffle.imageUrl ? 'none' : 'flex' }}
                            >
                              <Trophy className="w-10 h-10 text-yellow-500" />
                            </div>
                          </div>

                          {/* Conteúdo principal */}
                          <div className="flex-1 flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-2">{raffle.title}</h3>
                              <p className="text-gray-600 mb-3">{raffle.description}</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Prêmio:</span>
                                  <p className="font-medium">{raffle.prizeDescription}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Custo:</span>
                                  <p className="font-medium">{raffle.entryCost} pontos</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Período:</span>
                                  <p className="font-medium">{raffle.startDate} até {raffle.endDate}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Participações:</span>
                                  <p className="font-medium">{raffle.totalEntries}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingRaffle(raffle)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => confirmDelete('raffle', raffle.id, raffle.title)}
                                disabled={!!deletingId}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Aba: Loja de Resgates */}
            <TabsContent value="rewards" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Gerenciar Recompensas</h2>
                <Button 
                  onClick={() => setEditingReward({
                    id: 'reward_new',
                    title: '',
                    description: '',
                    pointsCost: 50,
                    rewardType: 'sample',
                    stockQuantity: -1,
                    isActive: true
                  })}
                  className="bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Recompensa
                </Button>
              </div>

              {rewards.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma recompensa cadastrada. Adicione itens à loja para que as usuárias possam resgatá-los!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rewards.map((reward) => (
                    <Card key={reward.id} data-row-id={reward.id} className="bg-white/80 backdrop-blur-sm overflow-hidden">
                      <div className="aspect-video bg-gradient-to-br from-pink-100 to-purple-100 relative">
                        {reward.imageUrl ? (
                          <img 
                            src={reward.imageUrl} 
                            alt={reward.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling!.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className="absolute inset-0 flex items-center justify-center"
                          style={{ display: reward.imageUrl ? 'none' : 'flex' }}
                        >
                          <Gift className="w-16 h-16 text-pink-400" />
                        </div>
                        <Badge className="absolute top-3 right-3 bg-yellow-100 text-yellow-800">
                          <Coins className="w-3 h-3 mr-1" />
                          {reward.pointsCost} pts
                        </Badge>
                        <div className="absolute top-3 left-3">
                          <Badge className={reward.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                            {reward.isActive ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                            {reward.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2">{reward.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{reward.description}</p>

                        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                          <span>Tipo: {reward.rewardType}</span>
                          <span>{reward.stockQuantity === -1 ? 'Ilimitado' : `${reward.stockQuantity} disponíveis`}</span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingReward(reward)}
                            className="flex-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmDelete('reward', reward.id, reward.title)}
                            disabled={!!deletingId}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Modal de Recompensas */}
      {editingReward && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{ paddingRight: 0 }}>
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto modal-content">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="w-6 h-6 text-green-500" />
                  {editingReward.id && !editingReward.id.startsWith('reward_') ? 'Editar Recompensa' : 'Nova Recompensa'}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100 rounded-full"
                  onClick={() => setEditingReward(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Configure uma recompensa para a loja de pontos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reward-title">Título da Recompensa *</Label>
                  <Input
                    id="reward-title"
                    placeholder="Ex: Cupom 15% OFF"
                    value={editingReward.title}
                    onChange={(e) => setEditingReward(prev => prev ? {...prev, title: e.target.value} : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reward-cost">Custo em Pontos *</Label>
                  <Input
                    id="reward-cost"
                    type="number"
                    min="1"
                    placeholder="100"
                    value={editingReward.pointsCost}
                    onChange={(e) => setEditingReward(prev => prev ? {...prev, pointsCost: parseInt(e.target.value) || 0} : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward-description">Descrição *</Label>
                <Textarea
                  id="reward-description"
                  placeholder="Descreva a recompensa..."
                  value={editingReward.description}
                  onChange={(e) => setEditingReward(prev => prev ? {...prev, description: e.target.value} : null)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reward-type">Tipo de Recompensa *</Label>
                  <Select 
                    value={editingReward.rewardType} 
                    onValueChange={(value) => setEditingReward(prev => prev ? {...prev, rewardType: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sample">🎁 Amostra</SelectItem>
                      <SelectItem value="coupon">🎫 Cupom</SelectItem>
                      <SelectItem value="product">📦 Produto</SelectItem>
                      <SelectItem value="service">⚡ Serviço</SelectItem>
                      <SelectItem value="discount">💰 Desconto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reward-stock">Estoque</Label>
                  <Input
                    id="reward-stock"
                    type="number"
                    placeholder="-1 para ilimitado"
                    value={editingReward.stockQuantity === -1 ? '' : editingReward.stockQuantity}
                    onChange={(e) => setEditingReward(prev => prev ? {...prev, stockQuantity: e.target.value === '' ? -1 : parseInt(e.target.value) || 0} : null)}
                  />
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <Switch
                    checked={editingReward.isActive}
                    onCheckedChange={(checked) => setEditingReward(prev => prev ? {...prev, isActive: checked} : null)}
                  />
                  <Label>Recompensa Ativa</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reward-image">URL da Imagem (Opcional)</Label>
                <Input
                  id="reward-image"
                  type="url"
                  placeholder="https://exemplo.com/imagem.jpg"
                  value={editingReward.imageUrl || ''}
                  onChange={(e) => setEditingReward(prev => prev ? {...prev, imageUrl: e.target.value} : null)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => saveReward(editingReward)} 
                  disabled={savingReward}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  {savingReward ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Recompensa
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingReward(null)}
                  disabled={savingReward}
                  className="px-6"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modais de Edição - TODO: Implementar formulários completos */}
      {editingMission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{ paddingRight: 0 }}>
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto modal-content">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-6 h-6 text-purple-500" />
                  {editingMission.id && !editingMission.id.startsWith('mission_') ? 'Editar Missão' : 'Nova Missão'}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100 rounded-full"
                  onClick={() => setEditingMission(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Configure uma missão completa com validação automática e requisitos específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mission-title">Título da Missão *</Label>
                  <Input
                    id="mission-title"
                    placeholder="Ex: Primeira Visualização"
                    value={editingMission.title}
                    onChange={(e) => setEditingMission(prev => prev ? {...prev, title: e.target.value} : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mission-points">Pontos de Recompensa *</Label>
                  <Input
                    id="mission-points"
                    type="number"
                    min="1"
                    placeholder="Ex: 25"
                    value={editingMission.pointsReward}
                    onChange={(e) => setEditingMission(prev => prev ? {...prev, pointsReward: parseInt(e.target.value) || 0} : null)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mission-description">Descrição Completa *</Label>
                <Textarea
                  id="mission-description"
                  placeholder="Descreva o que o usuário precisa fazer para completar esta missão..."
                  value={editingMission.description}
                  onChange={(e) => setEditingMission(prev => prev ? {...prev, description: e.target.value} : null)}
                  rows={3}
                />
              </div>

              {/* Configurações da Missão */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mission-type">Tipo de Missão *</Label>
                  <Select 
                    value={editingMission.missionType} 
                    onValueChange={(value) => setEditingMission(prev => prev ? {...prev, missionType: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="achievement">🏆 Conquista (Uma vez)</SelectItem>
                      <SelectItem value="daily">📅 Diária</SelectItem>
                      <SelectItem value="weekly">📆 Semanal</SelectItem>
                      <SelectItem value="monthly">🗓️ Mensal</SelectItem>
                      <SelectItem value="permanent">♾️ Permanente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mission-action">Ação Requerida *</Label>
                  <Select 
                    value={editingMission.actionRequired} 
                    onValueChange={(value) => setEditingMission(prev => prev ? {...prev, actionRequired: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a ação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video_watched">🎥 Assistir Vídeos</SelectItem>
                      <SelectItem value="video_liked">❤️ Curtir Vídeos</SelectItem>
                      <SelectItem value="video_commented">💬 Comentar Vídeos</SelectItem>
                      <SelectItem value="video_shared">📤 Compartilhar Vídeos</SelectItem>
                      <SelectItem value="product_downloaded">⬇️ Baixar Produtos</SelectItem>
                      <SelectItem value="product_shared">📋 Compartilhar Produtos</SelectItem>
                      <SelectItem value="product_commented">💭 Comentar Produtos</SelectItem>
                      <SelectItem value="coupon_used">🎫 Usar Cupons</SelectItem>
                      <SelectItem value="referral_general">👥 Indicar Usuários Geral</SelectItem>
                      <SelectItem value="referral_free">👤 Indicar Usuário Free</SelectItem>
                      <SelectItem value="referral_premium">👑 Indicar Usuário Premium</SelectItem>
                      <SelectItem value="login_streak">🔥 Sequência de Logins</SelectItem>
                      <SelectItem value="profile_updated">👤 Atualizar Perfil</SelectItem>
                      <SelectItem value="mission_completed">✅ Completar Missões</SelectItem>
                      <SelectItem value="reward_redeemed">🎁 Resgatar Recompensas</SelectItem>
                      <SelectItem value="raffle_entered">🎰 Participar Sorteios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mission-target">Meta (Quantidade) *</Label>
                  <Input
                    id="mission-target"
                    type="number"
                    min="1"
                    placeholder="Ex: 5"
                    value={editingMission.targetCount}
                    onChange={(e) => setEditingMission(prev => prev ? {...prev, targetCount: parseInt(e.target.value) || 1} : null)}
                  />
                </div>
              </div>

              {/* Restrições por Nível */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <Label className="text-base font-semibold">Restrições por Nível</Label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nível Mínimo</Label>
                    <Select 
                      value={editingMission.minLevel || 'bronze'} 
                      onValueChange={(value) => setEditingMission(prev => prev ? {...prev, minLevel: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">🥉 Bronze (0+ pts)</SelectItem>
                        <SelectItem value="silver">🥈 Silver (100+ pts)</SelectItem>
                        <SelectItem value="gold">🥇 Gold (500+ pts)</SelectItem>
                        <SelectItem value="diamond">💎 Diamond (1500+ pts)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Pontos Mínimos</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={editingMission.minPoints || 0}
                      onChange={(e) => setEditingMission(prev => prev ? {...prev, minPoints: parseInt(e.target.value) || 0} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Limite de Usos</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0 (ilimitado)"
                      value={editingMission.usageLimit || 0}
                      onChange={(e) => setEditingMission(prev => prev ? {...prev, usageLimit: parseInt(e.target.value) || 0} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm invisible">Apenas Premium</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingMission.premiumOnly || false}
                        onCheckedChange={(checked) => setEditingMission(prev => prev ? {...prev, premiumOnly: checked} : null)}
                      />
                      <Label>Apenas Premium</Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Aparência */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-pink-500" />
                  <Label className="text-base font-semibold">Aparência</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Ícone</Label>
                    <Select 
                      value={editingMission.icon} 
                      onValueChange={(value) => setEditingMission(prev => prev ? {...prev, icon: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="play">▶️ Play</SelectItem>
                        <SelectItem value="heart">❤️ Heart</SelectItem>
                        <SelectItem value="message-circle">💬 Message</SelectItem>
                        <SelectItem value="share-2">📤 Share</SelectItem>
                        <SelectItem value="download">⬇️ Download</SelectItem>
                        <SelectItem value="tag">🎫 Tag</SelectItem>
                        <SelectItem value="users">👥 Users</SelectItem>
                        <SelectItem value="target">🎯 Target</SelectItem>
                        <SelectItem value="star">⭐ Star</SelectItem>
                        <SelectItem value="gift">🎁 Gift</SelectItem>
                        <SelectItem value="zap">⚡ Zap</SelectItem>
                        <SelectItem value="trophy">🏆 Trophy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editingMission.color}
                        onChange={(e) => setEditingMission(prev => prev ? {...prev, color: e.target.value} : null)}
                        className="w-16 h-10 p-1 border rounded"
                      />
                      <Input
                        type="text"
                        value={editingMission.color}
                        onChange={(e) => setEditingMission(prev => prev ? {...prev, color: e.target.value} : null)}
                        placeholder="#ff6b9d"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Preview</Label>
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${editingMission.color}20` }}
                    >
                      {renderIcon(editingMission.icon, "w-6 h-6", { color: editingMission.color })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Período de Atividade */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <Label className="text-base font-semibold">Período de Atividade</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Input
                      type="datetime-local"
                      value={editingMission.startDate ? new Date(editingMission.startDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingMission(prev => prev ? {...prev, startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined} : null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Delete') {
                          e.preventDefault();
                          setEditingMission(prev => prev ? {...prev, startDate: undefined} : null);
                        }
                      }}
                      placeholder=""
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Fim (Opcional)</Label>
                    <Input
                      type="datetime-local"
                      value={editingMission.endDate ? new Date(editingMission.endDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setEditingMission(prev => prev ? {...prev, endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined} : null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Delete') {
                          e.preventDefault();
                          setEditingMission(prev => prev ? {...prev, endDate: undefined} : null);
                        }
                      }}
                      placeholder=""
                    />
                  </div>
                  <div className="flex items-center space-x-2 mt-6">
                    <Switch
                      checked={editingMission.isActive}
                      onCheckedChange={(checked) => setEditingMission(prev => prev ? {...prev, isActive: checked} : null)}
                    />
                    <Label>Missão Ativa</Label>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => saveMission(editingMission)} 
                  disabled={savingMission}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                >
                  {savingMission ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Missão
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingMission(null)}
                  disabled={savingMission}
                  className="px-6"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Sorteios */}
      {editingRaffle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" style={{ paddingRight: 0 }}>
          <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto modal-content">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  {editingRaffle.id && !editingRaffle.id.startsWith('raffle_') ? 'Editar Sorteio' : 'Novo Sorteio'}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100 rounded-full"
                  onClick={() => setEditingRaffle(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                Configure um sorteio completo com prêmios, imagens, regras e restrições por nível
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-500" />
                  <Label className="text-base font-semibold">Informações Básicas</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="raffle-title">Título do Sorteio *</Label>
                    <Input
                      id="raffle-title"
                      placeholder="Ex: Kit Completo de Beleza Premium"
                      value={editingRaffle.title}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, title: e.target.value} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raffle-category">Categoria *</Label>
                    <Select 
                      value={editingRaffle.category || 'Beleza'} 
                      onValueChange={(value) => setEditingRaffle(prev => prev ? {...prev, category: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beleza">💄 Beleza</SelectItem>
                        <SelectItem value="Perfumes">🌸 Perfumes</SelectItem>
                        <SelectItem value="Cabelos">💇 Cabelos</SelectItem>
                        <SelectItem value="Skincare">✨ Skincare</SelectItem>
                        <SelectItem value="Maquiagem">🎨 Maquiagem</SelectItem>
                        <SelectItem value="Acessórios">👜 Acessórios</SelectItem>
                        <SelectItem value="Geral">🎁 Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="raffle-description">Descrição do Sorteio *</Label>
                  <Textarea
                    id="raffle-description"
                    placeholder="Descreva o sorteio de forma atrativa para as usuárias..."
                    value={editingRaffle.description}
                    onChange={(e) => setEditingRaffle(prev => prev ? {...prev, description: e.target.value} : null)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Prêmio e Valor */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-green-500" />
                  <Label className="text-base font-semibold">Prêmio e Valor</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="raffle-prize">Descrição do Prêmio *</Label>
                    <Input
                      id="raffle-prize"
                      placeholder="Ex: Kit premium com 15 produtos"
                      value={editingRaffle.prizeDescription}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, prizeDescription: e.target.value} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raffle-value">Valor do Prêmio (R$)</Label>
                    <Input
                      id="raffle-value"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={editingRaffle.prizeValue || 0}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, prizeValue: parseFloat(e.target.value) || 0} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raffle-winners">Número de Vencedores *</Label>
                    <Input
                      id="raffle-winners"
                      type="number"
                      min="1"
                      placeholder="1"
                      value={editingRaffle.winnerCount || 1}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, winnerCount: parseInt(e.target.value) || 1} : null)}
                    />
                  </div>
                </div>
              </div>

              {/* Imagem do Sorteio */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="w-5 h-5 text-purple-500" />
                  <Label className="text-base font-semibold">Imagem do Sorteio</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="raffle-image">URL da Imagem</Label>
                    <Input
                      id="raffle-image"
                      type="url"
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={editingRaffle.imageUrl || ''}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, imageUrl: e.target.value} : null)}
                    />
                    <p className="text-xs text-gray-500">Recomendado: 400x300px, formato JPG ou PNG</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Preview da Imagem</Label>
                    <div className="w-32 h-24 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      {editingRaffle.imageUrl ? (
                        <img 
                          src={editingRaffle.imageUrl} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="text-gray-400 text-xs text-center p-2" style={{ display: editingRaffle.imageUrl ? 'none' : 'flex' }}>
                        <Image className="w-6 h-6 mx-auto mb-1" />
                        Sem imagem
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configurações de Participação */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-yellow-500" />
                  <Label className="text-base font-semibold">Configurações de Participação</Label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="raffle-cost">Custo (Pontos) *</Label>
                    <Input
                      id="raffle-cost"
                      type="number"
                      min="0"
                      placeholder="10"
                      value={editingRaffle.entryCost}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, entryCost: parseInt(e.target.value) || 0} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raffle-max-entries">Máx/Usuária *</Label>
                    <Input
                      id="raffle-max-entries"
                      type="number"
                      min="1"
                      placeholder="20"
                      value={editingRaffle.maxEntriesPerUser}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, maxEntriesPerUser: parseInt(e.target.value) || 1} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raffle-max-participants">Máx Participantes</Label>
                    <Input
                      id="raffle-max-participants"
                      type="number"
                      min="1"
                      placeholder="1000"
                      value={editingRaffle.maxParticipants || 1000}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, maxParticipants: parseInt(e.target.value) || 0} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raffle-min-points">Pontos Mínimos</Label>
                    <Input
                      id="raffle-min-points"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={editingRaffle.minPoints || 0}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, minPoints: parseInt(e.target.value) || 0} : null)}
                    />
                  </div>
                </div>
              </div>

              {/* Restrições por Nível */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <Label className="text-base font-semibold">Restrições</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Nível Mínimo</Label>
                    <Select 
                      value={editingRaffle.minLevel || 'bronze'} 
                      onValueChange={(value) => setEditingRaffle(prev => prev ? {...prev, minLevel: value} : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bronze">🥉 Bronze (0+ pts)</SelectItem>
                        <SelectItem value="silver">🥈 Silver (100+ pts)</SelectItem>
                        <SelectItem value="gold">🥇 Gold (500+ pts)</SelectItem>
                        <SelectItem value="diamond">💎 Diamond (1500+ pts)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Datas do Sorteio */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <Label className="text-base font-semibold">Cronograma do Sorteio</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início *</Label>
                    <Input
                      type="date"
                      value={editingRaffle.startDate}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, startDate: e.target.value} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Fim *</Label>
                    <Input
                      type="date"
                      value={editingRaffle.endDate}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, endDate: e.target.value} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Data do Sorteio</Label>
                    <Input
                      type="date"
                      value={editingRaffle.drawDate || ''}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, drawDate: e.target.value} : null)}
                    />
                  </div>
                </div>
              </div>

              {/* Patrocínio */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-pink-500" />
                  <Label className="text-base font-semibold">Patrocínio (Opcional)</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="space-y-2">
                    <Label htmlFor="raffle-sponsor">Nome do Patrocinador</Label>
                    <Input
                      id="raffle-sponsor"
                      placeholder="Ex: Beleza & Cia"
                      value={editingRaffle.sponsorName || ''}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, sponsorName: e.target.value} : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="raffle-sponsor-logo">Logo do Patrocinador (URL)</Label>
                    <Input
                      id="raffle-sponsor-logo"
                      type="url"
                      placeholder="https://exemplo.com/logo.png"
                      value={editingRaffle.sponsorLogo || ''}
                      onChange={(e) => setEditingRaffle(prev => prev ? {...prev, sponsorLogo: e.target.value} : null)}
                    />
                    <p className="text-xs text-gray-500">Recomendado: 200x80px, formato PNG com fundo transparente</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Preview da Logo</Label>
                    <div className="w-32 h-24 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                      {editingRaffle.sponsorLogo ? (
                        <img 
                          src={editingRaffle.sponsorLogo} 
                          alt="Preview da Logo" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className="text-gray-400 text-xs text-center p-2 flex flex-col items-center justify-center" style={{ display: editingRaffle.sponsorLogo ? 'none' : 'flex' }}>
                        <Award className="w-6 h-6 mb-1" />
                        Sem logo
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regras */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-500" />
                  <Label className="text-base font-semibold">Regras do Sorteio</Label>
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="Digite as regras detalhadas do sorteio..."
                    value={editingRaffle.rules || ''}
                    onChange={(e) => setEditingRaffle(prev => prev ? {...prev, rules: e.target.value} : null)}
                    rows={4}
                  />
                </div>
              </div>

              {/* Configurações Finais */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <Label className="text-base font-semibold">Configurações Finais</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg bg-purple-50">
                    <Switch
                      checked={editingRaffle.premiumOnly || false}
                      onCheckedChange={(checked) => setEditingRaffle(prev => prev ? {...prev, premiumOnly: checked} : null)}
                    />
                    <div>
                      <Label className="text-sm font-medium">Apenas Premium</Label>
                      <p className="text-xs text-gray-500">Restringir participação apenas para usuários premium</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border rounded-lg bg-green-50">
                    <Switch
                      checked={editingRaffle.isActive}
                      onCheckedChange={(checked) => setEditingRaffle(prev => prev ? {...prev, isActive: checked} : null)}
                    />
                    <div>
                      <Label className="text-sm font-medium">Sorteio Ativo</Label>
                      <p className="text-xs text-gray-500">Permitir que usuários participem do sorteio</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={() => saveRaffle(editingRaffle)} 
                  disabled={savingRaffle}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700"
                >
                  {savingRaffle ? (
                    <>
                      <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Sorteio
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingRaffle(null)}
                  disabled={savingRaffle}
                  className="px-6"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirm?.open || false} onOpenChange={(open) => !deletingItem && setDeleteConfirm(open ? deleteConfirm : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold">
                {deleteConfirm?.type === 'mission' ? 'a missão' : 
                 deleteConfirm?.type === 'raffle' ? 'o sorteio' : 
                 'a recompensa'} "{deleteConfirm?.title}"
              </span>?
              <br />
              <span className="text-red-600">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingItem}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deletingItem}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600 disabled:opacity-50"
            >
              {deletingItem ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}