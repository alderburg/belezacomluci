
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, MousePointerClick, TrendingUp, Target, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-md shadow-lg p-3">
        <p className="text-sm font-medium">{data.date}</p>
        <p className="text-xs text-muted-foreground">
          Cliques: <span className="font-bold text-foreground">{data.count?.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsEngagementMobilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [tempDateRange, setTempDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const { data: stats, isLoading } = useQuery<AnalyticsStats>({
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
    refetchInterval: 5000,
  });

  const handleApplyDateRange = () => {
    setDateRange(tempDateRange);
    setIsCalendarOpen(false);
  };

  const handleClearDateRange = () => {
    setTempDateRange({});
    setDateRange({});
    setIsCalendarOpen(false);
  };

  const handleCalendarOpenChange = (open: boolean) => {
    if (open) {
      setTempDateRange(dateRange);
    }
    setIsCalendarOpen(open);
  };

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

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={() => setLocation('/admin/analytics')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Engajamento</h1>
            <p className="text-sm text-muted-foreground">Cliques e conversões</p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Content */}
      <main className="px-4 pt-20 pb-6 space-y-4">
        {/* Filtro de Período */}
        <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full gap-2 text-xs" size="sm">
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
          <PopoverContent className="w-auto p-0" align="center">
            <div className="p-3">
              <CalendarComponent
                mode="range"
                selected={tempDateRange}
                onSelect={(range) => {
                  setTempDateRange(range || {});
                }}
                numberOfMonths={1}
                locale={ptBR}
              />
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClearDateRange}
                >
                  Limpar
                </Button>
                <Button 
                  size="sm"
                  onClick={handleApplyDateRange}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Métricas de Engajamento */}
        <div className="space-y-3">
          <Card className="bg-gradient-to-br from-pink-500 to-rose-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointerClick className="w-5 h-5 opacity-80" />
                <span className="font-semibold text-sm">Taxa de Clique</span>
              </div>
              <p className="text-3xl font-bold">
                {stats?.totalPageViews ? ((stats.totalClicks / stats.totalPageViews) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-white/80 text-xs mt-1">
                {stats?.totalClicks.toLocaleString() || 0} cliques / {stats?.totalPageViews.toLocaleString() || 0} visualizações
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 opacity-80" />
                <span className="font-semibold text-sm">Cliques por Visitante</span>
              </div>
              <p className="text-3xl font-bold">
                {stats?.uniqueVisitors ? (stats.totalClicks / stats.uniqueVisitors).toFixed(2) : 0}
              </p>
              <p className="text-white/80 text-xs mt-1">
                Média de interações por usuário
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 opacity-80" />
                <span className="font-semibold text-sm">Itens Rastreados</span>
              </div>
              <p className="text-3xl font-bold">
                {stats?.topClickedItems?.length || 0}
              </p>
              <p className="text-white/80 text-xs mt-1">
                Total de elementos monitorados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Cliques ao Longo do Tempo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Cliques ao Longo do Tempo
            </CardTitle>
            <CardDescription className="text-xs">Evolução temporal do engajamento</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.clicksOverTime && stats.clicksOverTime.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.clicksOverTime.map(item => ({
                    ...item,
                    date: format(parseISO(item.date), "dd/MM", { locale: ptBR }),
                    count: item.count
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }} 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#ff6b9d" 
                      strokeWidth={2} 
                      name="Cliques" 
                      dot={{ r: 3 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem dados temporais</p>
                  <p className="text-xs">O gráfico será preenchido com o tempo</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
