
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import MobileBottomNav from "@/components/mobile-bottom-nav";

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

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border rounded-md shadow-lg p-3">
        <p className="text-sm font-medium">{data.city || data.state}</p>
        <p className="text-xs text-muted-foreground">
          Visitantes: <span className="font-bold text-foreground">{data.count?.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function AdminAnalyticsGeographicMobilePage() {
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
            <h1 className="text-lg font-semibold text-foreground">Geografia</h1>
            <p className="text-sm text-muted-foreground">Localização dos usuários</p>
          </div>
          <MapPin className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Content */}
      <main className="px-4 pt-24 pb-6 space-y-4">
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

        {/* Top Cidades */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-5 h-5 text-emerald-500" />
              Top 10 Cidades
            </CardTitle>
            <CardDescription className="text-xs">Cidades com maior número de visitantes</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topCities && stats.topCities.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.topCities.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="city" 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                      tick={{ fontSize: 9 }} 
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma cidade registrada</p>
                  <p className="text-xs">Dados geográficos aparecerão aqui</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Estados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-5 h-5 text-cyan-500" />
              Top Estados
            </CardTitle>
            <CardDescription className="text-xs">Estados com maior alcance</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topStates && stats.topStates.length > 0 ? (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.topStates.slice(0, 8)}
                      dataKey="count"
                      nameKey="state"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.state}: ${entry.count}`}
                      labelLine={false}
                    >
                      {stats.topStates.slice(0, 8).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum estado registrado</p>
                  <p className="text-xs">Distribuição por estado aparecerá aqui</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabela Detalhada */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Distribuição Geográfica Completa</CardTitle>
            <CardDescription className="text-xs">
              Todas as localizações registradas ({stats?.topCities?.length || 0} cidades)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Cidade</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-right text-xs">Visitantes</TableHead>
                    <TableHead className="text-right text-xs">% do Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats?.topCities && stats.topCities.length > 0 ? (
                    stats.topCities.slice(0, 20).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-xs">{item.city}</TableCell>
                        <TableCell className="text-xs">{item.state}</TableCell>
                        <TableCell className="text-right text-xs">{item.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {stats.uniqueVisitors > 0 ? ((item.count / stats.uniqueVisitors) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center py-6">
                          <MapPin className="w-8 h-8 text-muted-foreground opacity-50 mb-2" />
                          <p className="text-xs text-muted-foreground">Nenhum dado geográfico</p>
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

      <MobileBottomNav />
    </div>
  );
}
