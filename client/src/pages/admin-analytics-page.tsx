
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Eye, MousePointerClick, MapPin, Clock, TrendingUp, Users, Target, Calendar } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/contexts/sidebar-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const { user } = useAuth();
  const { isOpen } = useSidebar();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: stats, isLoading } = useQuery<AnalyticsStats>({
    queryKey: ["/api/analytics/stats", dateRange],
  });

  const chartConfig = {
    clicks: {
      label: "Cliques",
      color: "#ff6b9d",
    },
    views: {
      label: "Visualizações",
      color: "#c084fc",
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <main className={`flex-1 transition-all duration-300 ${isOpen ? 'ml-64' : 'ml-16'} pt-16`}>
          <div className="container mx-auto px-6 py-8">
            <div className="mb-6">
              <Skeleton className="h-9 w-80 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
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
      <main className={`flex-1 transition-all duration-300 ${isOpen ? 'ml-64' : 'ml-16'} pt-16`}>
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">📊 Analytics & Métricas</h1>
              <p className="text-muted-foreground">Análise completa de desempenho e engajamento</p>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Selecionar período"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-pink-500 to-rose-500 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Eye className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-0">Total</Badge>
                </div>
                <h3 className="text-3xl font-bold mb-1">{stats?.totalPageViews.toLocaleString()}</h3>
                <p className="text-white/80 text-sm">Visualizações de Página</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-0">Únicos</Badge>
                </div>
                <h3 className="text-3xl font-bold mb-1">{stats?.uniqueVisitors.toLocaleString()}</h3>
                <p className="text-white/80 text-sm">Visitantes Únicos</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <MousePointerClick className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-0">Ações</Badge>
                </div>
                <h3 className="text-3xl font-bold mb-1">{stats?.totalClicks.toLocaleString()}</h3>
                <p className="text-white/80 text-sm">Total de Cliques</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-0">Taxa</Badge>
                </div>
                <h3 className="text-3xl font-bold mb-1">
                  {stats?.totalPageViews ? ((stats.totalClicks / stats.totalPageViews) * 100).toFixed(1) : 0}%
                </h3>
                <p className="text-white/80 text-sm">Taxa de Conversão</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="engagement">Engajamento</TabsTrigger>
              <TabsTrigger value="geographic">Geografia</TabsTrigger>
              <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Clicks by Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-pink-500" />
                      Cliques por Tipo
                    </CardTitle>
                    <CardDescription>Distribuição de cliques por categoria</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats?.clicksByType || []}
                            dataKey="count"
                            nameKey="type"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(entry) => `${entry.type}: ${entry.count}`}
                          >
                            {stats?.clicksByType.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Top Clicked Items */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MousePointerClick className="w-5 h-5 text-purple-500" />
                      Itens Mais Clicados
                    </CardTitle>
                    <CardDescription>Top 10 elementos com mais engajamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.topClickedItems.slice(0, 10) || []} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="targetName" type="category" width={100} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#ff6b9d" radius={[0, 8, 8, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalhamento de Cliques</CardTitle>
                  <CardDescription>Lista completa de itens rastreados</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats?.topClickedItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.targetName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.targetType}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {stats.totalClicks > 0 ? ((item.count / stats.totalClicks) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Engagement Tab */}
            <TabsContent value="engagement" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Cliques ao Longo do Tempo
                    </CardTitle>
                    <CardDescription>Evolução temporal do engajamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats?.clicksOverTime || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="count" stroke="#ff6b9d" strokeWidth={3} name="Cliques" />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Métricas de Engajamento</CardTitle>
                    <CardDescription>Indicadores principais</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                      <div className="flex items-center gap-2 mb-2">
                        <MousePointerClick className="w-5 h-5 text-pink-600" />
                        <span className="font-semibold text-sm">Taxa de Clique</span>
                      </div>
                      <p className="text-2xl font-bold text-pink-600">
                        {stats?.totalPageViews ? ((stats.totalClicks / stats.totalPageViews) * 100).toFixed(1) : 0}%
                      </p>
                    </div>

                    <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold text-sm">Cliques/Visitante</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600">
                        {stats?.uniqueVisitors ? (stats.totalClicks / stats.uniqueVisitors).toFixed(2) : 0}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-sm">Itens Rastreados</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {stats?.topClickedItems.length || 0}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Geographic Tab */}
            <TabsContent value="geographic" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Cities */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                      Top 10 Cidades
                    </CardTitle>
                    <CardDescription>Cidades com maior número de visitantes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.topCities.slice(0, 10) || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="city" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#34d399" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Top States */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-cyan-500" />
                      Top 10 Estados
                    </CardTitle>
                    <CardDescription>Estados com maior alcance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={chartConfig} className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats?.topStates.slice(0, 10) || []}
                            dataKey="count"
                            nameKey="state"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            label={(entry) => `${entry.state}: ${entry.count}`}
                          >
                            {stats?.topStates.slice(0, 10).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Geographic Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição Geográfica Completa</CardTitle>
                  <CardDescription>Detalhamento por localização</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posição</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Visitantes</TableHead>
                        <TableHead className="text-right">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats?.topCities.map((city, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant={index < 3 ? "default" : "outline"}>#{index + 1}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{city.city}</TableCell>
                          <TableCell>{city.state}</TableCell>
                          <TableCell className="text-right">{city.count.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            {stats.totalPageViews > 0 ? ((city.count / stats.totalPageViews) * 100).toFixed(1) : 0}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Linha do Tempo de Atividade
                  </CardTitle>
                  <CardDescription>Histórico detalhado de ações ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats?.clicksOverTime || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#ff6b9d" 
                          strokeWidth={3} 
                          name="Cliques"
                          dot={{ fill: '#ff6b9d', r: 5 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
