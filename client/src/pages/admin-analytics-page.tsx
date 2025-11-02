import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Eye, MousePointerClick, MapPin, Clock, TrendingUp, Users, Target, Calendar, Activity, Tag, Image } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/contexts/sidebar-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDataSync } from "@/hooks/use-data-sync";

const COLORS = ['#ff6b9d', '#c084fc', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c'];

interface AnalyticsStats {
  totalPageViews: number;
  uniqueVisitors: number;
  totalClicks: number;
  clicksByType: { type: string; count: number }[];
  topClickedItems: { targetName: string; targetType: string; count: number }[];
  clicksOverTime: { date: string; count: number }[];
  topCities: { city: string; state: string; count: number }[];
  topStates: { state: string; count: number }[];
}

export default function AdminAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isOpen } = useSidebar();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Conectar ao WebSocket para atualização em tempo real
  useDataSync();

  // Atualizar automaticamente quando houver mudanças via WebSocket
  useEffect(() => {
    const handleDataUpdate = (event: CustomEvent) => {
      const { dataType, action } = event.detail;
      
      // Recarregar dados quando houver atualizações de analytics, cupons, banners ou redes sociais
      if (dataType === 'analytics' || dataType === 'coupons' || dataType === 'banners' || dataType === 'community_settings') {
        console.log(`📊 Analytics: Recebida atualização de ${dataType} - ${action}, recarregando dados...`);
        refetch();
      }
    };

    window.addEventListener('data_update' as any, handleDataUpdate);
    return () => {
      window.removeEventListener('data_update' as any, handleDataUpdate);
    };
  }, [refetch]);

  // Aguardar autenticação antes de verificar admin
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: stats, isLoading, refetch } = useQuery<AnalyticsStats>({
    queryKey: ["/api/analytics/stats", dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.from) {
        params.append('startDate', dateRange.from.toISOString());
      }
      if (dateRange.to) {
        params.append('endDate', dateRange.to.toISOString());
      }

      const response = await fetch(`/api/analytics/stats?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics stats');
      }

      return response.json();
    },
    enabled: !!user?.isAdmin,
  });

  // Recarregar dados quando o calendário fechar
  const handleCalendarOpenChange = (open: boolean) => {
    if (!open && isCalendarOpen) {
      refetch();
    }
    setIsCalendarOpen(open);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className="flex-1 transition-all duration-300 pt-16">
          <div className="px-6 py-6 max-w-[1600px] mx-auto">
            <div className="mb-6">
              <Skeleton className="h-10 w-80 mb-3" />
              <Skeleton className="h-5 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 transition-all duration-300 pt-16">
        <div className="px-6 py-6 max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
                <Activity className="w-7 h-7 text-primary" />
                Analytics & Métricas
              </h1>
              <p className="text-sm text-muted-foreground">Análise completa de desempenho e engajamento</p>
            </div>
            <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 text-xs sm:text-sm">
                  <Calendar className="w-4 h-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Selecionar período"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end" onInteractOutside={(e) => {
                // Permitir fechar apenas clicando fora
                handleCalendarOpenChange(false);
              }}>
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range || {});
                    // Não fechar o modal ao selecionar
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-pink-500 to-rose-500 text-white border-0 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Eye className="w-7 h-7 opacity-80" />
                  <Badge className="bg-white/20 text-white border-0 text-xs">Total</Badge>
                </div>
                <h3 className="text-2xl font-bold mb-1">{stats?.totalPageViews.toLocaleString()}</h3>
                <p className="text-white/80 text-xs">Visualizações de Página</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white border-0 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <Users className="w-7 h-7 opacity-80" />
                  <Badge className="bg-white/20 text-white border-0 text-xs">Únicos</Badge>
                </div>
                <h3 className="text-2xl font-bold mb-1">{stats?.uniqueVisitors.toLocaleString()}</h3>
                <p className="text-white/80 text-xs">Visitantes Únicos</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <MousePointerClick className="w-7 h-7 opacity-80" />
                  <Badge className="bg-white/20 text-white border-0 text-xs">Ações</Badge>
                </div>
                <h3 className="text-2xl font-bold mb-1">{stats?.totalClicks.toLocaleString()}</h3>
                <p className="text-white/80 text-xs">Total de Cliques</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-0 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-7 h-7 opacity-80" />
                  <Badge className="bg-white/20 text-white border-0 text-xs">Taxa</Badge>
                </div>
                <h3 className="text-2xl font-bold mb-1">
                  {stats?.totalPageViews ? ((stats.totalClicks / stats.totalPageViews) * 100).toFixed(1) : 0}%
                </h3>
                <p className="text-white/80 text-xs">Taxa de Conversão</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
              <TabsTrigger value="overview" className="text-xs sm:text-sm">Visão Geral</TabsTrigger>
              <TabsTrigger value="engagement" className="text-xs sm:text-sm">Engajamento</TabsTrigger>
              <TabsTrigger value="geographic" className="text-xs sm:text-sm">Geografia</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Clicks by Type */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Target className="w-5 h-5 text-pink-500" />
                      Cliques por Tipo
                    </CardTitle>
                    <CardDescription className="text-xs">Distribuição de cliques por categoria</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {stats?.clicksByType && stats.clicksByType.length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.clicksByType.map(item => ({
                                ...item,
                                type: item.type === 'social_network' ? 'Redes Sociais' : item.type
                              }))}
                              dataKey="count"
                              nameKey="type"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              label={(entry) => `${entry.type}: ${entry.count}`}
                              labelLine={false}
                            >
                              {stats.clicksByType.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                        <div className="text-center p-6">
                          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground mb-1">Nenhum clique registrado</p>
                          <p className="text-xs text-muted-foreground/70">Os dados aparecerão aqui quando houver interações</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top Clicked Items */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MousePointerClick className="w-5 h-5 text-purple-500" />
                      Itens Mais Clicados
                    </CardTitle>
                    <CardDescription className="text-xs">Top 10 elementos com mais engajamento</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {stats?.topClickedItems && stats.topClickedItems.length > 0 ? (
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.topClickedItems.slice(0, 10).map(item => ({
                            ...item,
                            targetType: item.targetType === 'social_network' ? 'Redes Sociais' : item.targetType
                          }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis dataKey="targetName" type="category" width={90} tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Bar dataKey="count" fill="#ff6b9d" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[250px] flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                        <div className="text-center p-6">
                          <MousePointerClick className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground mb-1">Nenhum item clicado</p>
                          <p className="text-xs text-muted-foreground/70">Os itens mais populares aparecerão aqui</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Tables by Category */}
              <div className="space-y-4">
                {/* Cupons */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Tag className="w-5 h-5 text-pink-500" />
                      Cupons
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cliques em cupons ({stats?.topClickedItems?.filter(item => item.targetType === 'coupon').length || 0} itens)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="text-xs">Cupom</TableHead>
                            <TableHead className="text-right text-xs">Cliques</TableHead>
                            <TableHead className="text-right text-xs">% do Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats?.topClickedItems && stats.topClickedItems.filter(item => item.targetType === 'coupon').length > 0 ? (
                            stats.topClickedItems
                              .filter(item => item.targetType === 'coupon')
                              .map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium text-xs max-w-[200px] truncate">{item.targetName}</TableCell>
                                  <TableCell className="text-right text-xs">{item.count.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-xs font-medium">
                                    {stats.totalClicks > 0 ? ((item.count / stats.totalClicks) * 100).toFixed(1) : 0}%
                                  </TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-6">
                                  <Tag className="w-8 h-8 text-muted-foreground opacity-50 mb-2" />
                                  <p className="text-xs text-muted-foreground">Nenhum clique em cupons</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Banners */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Image className="w-5 h-5 text-purple-500" />
                      Banners
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cliques em banners ({stats?.topClickedItems?.filter(item => item.targetType === 'banner').length || 0} itens)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="text-xs">Banner</TableHead>
                            <TableHead className="text-right text-xs">Cliques</TableHead>
                            <TableHead className="text-right text-xs">% do Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats?.topClickedItems && stats.topClickedItems.filter(item => item.targetType === 'banner').length > 0 ? (
                            stats.topClickedItems
                              .filter(item => item.targetType === 'banner')
                              .map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium text-xs max-w-[200px] truncate">{item.targetName}</TableCell>
                                  <TableCell className="text-right text-xs">{item.count.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-xs font-medium">
                                    {stats.totalClicks > 0 ? ((item.count / stats.totalClicks) * 100).toFixed(1) : 0}%
                                  </TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-6">
                                  <Image className="w-8 h-8 text-muted-foreground opacity-50 mb-2" />
                                  <p className="text-xs text-muted-foreground">Nenhum clique em banners</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Redes Sociais */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-500" />
                      Redes Sociais
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cliques em redes sociais ({stats?.topClickedItems?.filter(item => item.targetType === 'social_network').length || 0} itens)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="text-xs">Rede Social</TableHead>
                            <TableHead className="text-right text-xs">Cliques</TableHead>
                            <TableHead className="text-right text-xs">% do Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stats?.topClickedItems && stats.topClickedItems.filter(item => item.targetType === 'social_network').length > 0 ? (
                            stats.topClickedItems
                              .filter(item => item.targetType === 'social_network')
                              .map((item, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-medium text-xs max-w-[200px] truncate">{item.targetName}</TableCell>
                                  <TableCell className="text-right text-xs">{item.count.toLocaleString()}</TableCell>
                                  <TableCell className="text-right text-xs font-medium">
                                    {stats.totalClicks > 0 ? ((item.count / stats.totalClicks) * 100).toFixed(1) : 0}%
                                  </TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-6">
                                  <Users className="w-8 h-8 text-muted-foreground opacity-50 mb-2" />
                                  <p className="text-xs text-muted-foreground">Nenhum clique em redes sociais</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Cliques ao Longo do Tempo
                    </CardTitle>
                    <CardDescription className="text-xs">Evolução temporal do engajamento</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {stats?.clicksOverTime && stats.clicksOverTime.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats.clicksOverTime.map(item => ({
                            ...item,
                            date: format(parseISO(item.date), "dd/MM/yyyy", { locale: ptBR })
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Line type="monotone" dataKey="count" stroke="#ff6b9d" strokeWidth={2} name="Cliques" dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                        <div className="text-center p-6">
                          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground mb-1">Sem dados temporais</p>
                          <p className="text-xs text-muted-foreground/70">O gráfico será preenchido com o tempo</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Métricas de Engajamento</CardTitle>
                    <CardDescription className="text-xs">Indicadores principais</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MousePointerClick className="w-4 h-4 text-pink-600" />
                        <span className="font-semibold text-xs">Taxa de Clique</span>
                      </div>
                      <p className="text-xl font-bold text-pink-600">
                        {stats?.totalPageViews ? ((stats.totalClicks / stats.totalPageViews) * 100).toFixed(1) : 0}%
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold text-xs">Cliques/Visitante</span>
                      </div>
                      <p className="text-xl font-bold text-purple-600">
                        {stats?.uniqueVisitors ? (stats.totalClicks / stats.uniqueVisitors).toFixed(2) : 0}
                      </p>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-xs">Itens Rastreados</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">
                        {stats?.topClickedItems.length || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Geographic Tab */}
            <TabsContent value="geographic" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Cities */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      Top 10 Cidades
                    </CardTitle>
                    <CardDescription className="text-xs">Cidades com maior número de visitantes</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {stats?.topCities && stats.topCities.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={stats.topCities.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="city" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                        <div className="text-center p-6">
                          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground mb-1">Nenhuma cidade registrada</p>
                          <p className="text-xs text-muted-foreground/70">Dados geográficos aparecerão aqui</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Top States */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MapPin className="w-5 h-5 text-cyan-500" />
                      Top 10 Estados
                    </CardTitle>
                    <CardDescription className="text-xs">Estados com maior alcance</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {stats?.topStates && stats.topStates.length > 0 ? (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats.topStates.slice(0, 10)}
                              dataKey="count"
                              nameKey="state"
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              label={(entry) => `${entry.state}: ${entry.count}`}
                              labelLine={false}
                            >
                              {stats.topStates.slice(0, 10).map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                        <div className="text-center p-6">
                          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-sm font-medium text-muted-foreground mb-1">Nenhum estado registrado</p>
                          <p className="text-xs text-muted-foreground/70">Distribuição por estado aparecerá aqui</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Geographic Table */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Distribuição Geográfica Completa</CardTitle>
                  <CardDescription className="text-xs">Detalhamento por localização</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Pos.</TableHead>
                          <TableHead className="text-xs">Cidade</TableHead>
                          <TableHead className="text-xs">Estado</TableHead>
                          <TableHead className="text-right text-xs">Visitantes</TableHead>
                          <TableHead className="text-right text-xs">% do Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stats?.topCities && stats.topCities.length > 0 ? (
                          stats.topCities.slice(0, 15).map((city, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant={index < 3 ? "default" : "outline"} className="text-xs">#{index + 1}</Badge>
                              </TableCell>
                              <TableCell className="font-medium text-xs">{city.city}</TableCell>
                              <TableCell className="text-xs">{city.state}</TableCell>
                              <TableCell className="text-right text-xs">{city.count.toLocaleString()}</TableCell>
                              <TableCell className="text-right text-xs font-medium">
                                {stats.totalPageViews > 0 ? ((city.count / stats.totalPageViews) * 100).toFixed(1) : 0}%
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="h-32 text-center">
                              <div className="flex flex-col items-center justify-center py-8">
                                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3">
                                  <MapPin className="w-6 h-6 text-muted-foreground opacity-50" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Nenhum dado geográfico</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Dados de localização aparecerão aqui</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Linha do Tempo de Atividade
                  </CardTitle>
                  <CardDescription className="text-xs">Histórico detalhado de ações ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {stats?.clicksOverTime && stats.clicksOverTime.length > 0 ? (
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.clicksOverTime.map(item => ({
                          ...item,
                          date: format(parseISO(item.date), "dd/MM/yyyy", { locale: ptBR })
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={70} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#ff6b9d" 
                            strokeWidth={2} 
                            name="Cliques"
                            dot={{ fill: '#ff6b9d', r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                      <div className="text-center p-6">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-sm font-medium text-muted-foreground mb-1">Sem histórico de atividade</p>
                        <p className="text-xs text-muted-foreground/70">A linha do tempo será construída com as interações</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}