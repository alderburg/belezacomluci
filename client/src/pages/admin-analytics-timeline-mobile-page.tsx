
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clock, Calendar, Activity, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface TimelineData {
  items: { targetType: string; targetId: string | null; targetName: string }[];
  clicks: { id: string; targetName: string; targetType: string; date: string; time: string; hour: number; city: string | null; state: string | null; createdAt: string }[];
  hourlyDistribution: { hour: number; count: number }[];
  dailyDistribution: { date: string; count: number }[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-md shadow-lg p-3">
        <p className="text-sm font-medium">{data.hour !== undefined ? `${data.hour}h` : data.displayDate}</p>
        <p className="text-xs text-muted-foreground">
          Cliques: <span className="font-bold text-foreground">{data.count?.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsTimelineMobilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [timelineType, setTimelineType] = useState<string>("all");
  const [timelineItem, setTimelineItem] = useState<string>("all");

  const { data: timelineData, isLoading } = useQuery<TimelineData>({
    queryKey: ["/api/analytics/timeline", timelineType, timelineItem],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (timelineType && timelineType !== "all") {
        params.append('targetType', timelineType);
      }
      if (timelineItem && timelineItem !== "all") {
        params.append('targetId', timelineItem);
      }

      const response = await fetch(`/api/analytics/timeline?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch timeline data');
      }

      return response.json();
    },
    enabled: !!user?.isAdmin,
    refetchInterval: 5000,
  });

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
            <h1 className="text-lg font-semibold text-foreground">Timeline</h1>
            <p className="text-sm text-muted-foreground">Histórico detalhado</p>
          </div>
          <Clock className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Content */}
      <main className="px-4 pt-24 pb-6 space-y-4">
        {/* Filtros */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-orange-500" />
              Filtros
            </CardTitle>
            <CardDescription className="text-xs">Selecione o tipo e item para análise detalhada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-xs font-medium">Tipo de Interação</label>
              <Select
                value={timelineType}
                onValueChange={(value) => {
                  setTimelineType(value);
                  setTimelineItem("all");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="coupon">Cupons</SelectItem>
                  <SelectItem value="banner">Banners</SelectItem>
                  <SelectItem value="social_network">Redes Sociais</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium">Item Específico</label>
              <Select
                value={timelineItem}
                onValueChange={setTimelineItem}
                disabled={timelineType === "all"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {timelineData?.items
                    ?.filter(item => timelineType === "all" || item.targetType === timelineType)
                    .map(item => (
                      <SelectItem key={item.targetId || item.targetName} value={item.targetId || item.targetName}>
                        {item.targetName}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por Horário */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-pink-500" />
              Distribuição por Horário
            </CardTitle>
            <CardDescription className="text-xs">Cliques por hora do dia</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineData?.hourlyDistribution && timelineData.hourlyDistribution.some(h => h.count > 0) ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData.hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#ff6b9d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem dados</p>
                  <p className="text-xs">Selecione filtros para visualizar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Dia */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-5 h-5 text-purple-500" />
              Distribuição por Dia
            </CardTitle>
            <CardDescription className="text-xs">Cliques ao longo dos dias</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineData?.dailyDistribution && timelineData.dailyDistribution.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData.dailyDistribution.map(item => ({
                    ...item,
                    displayDate: format(parseISO(item.date), "dd/MM", { locale: ptBR }),
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="displayDate" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#c084fc" 
                      strokeWidth={2} 
                      dot={{ fill: '#c084fc', r: 3 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem dados</p>
                  <p className="text-xs">Selecione filtros para visualizar</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Cliques Detalhados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-5 h-5 text-blue-500" />
              Cliques Detalhados
            </CardTitle>
            <CardDescription className="text-xs">
              Últimos 20 registros ({timelineData?.clicks.length || 0} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Item</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Data/Hora</TableHead>
                    <TableHead className="text-xs">Local</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timelineData?.clicks && timelineData.clicks.length > 0 ? (
                    timelineData.clicks.slice(0, 20).map((click) => (
                      <TableRow key={click.id}>
                        <TableCell className="font-medium text-xs max-w-[120px] truncate">
                          {click.targetName}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline" className="text-xs">
                            {click.targetType === 'coupon' ? 'Cupom' : 
                             click.targetType === 'banner' ? 'Banner' : 
                             click.targetType === 'social_network' ? 'Rede' : click.targetType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>
                            <div>{format(parseISO(click.date), "dd/MM", { locale: ptBR })}</div>
                            <div className="text-muted-foreground">{click.time}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {click.city && click.state ? (
                            <div>
                              <div>{click.city}</div>
                              <div className="text-muted-foreground">{click.state}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center py-6">
                          <Activity className="w-8 h-8 text-muted-foreground opacity-50 mb-2" />
                          <p className="text-xs text-muted-foreground">Nenhum clique registrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
