
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, Users, MousePointerClick, TrendingUp, Target, Tag, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ['#ff6b9d', '#c084fc', '#60a5fa', '#34d399'];

const translateTargetType = (type: string): string => {
  const translations: Record<string, string> = {
    'coupon': 'Cupom',
    'banner': 'Banner',
    'social_network': 'Rede Social',
  };
  return translations[type] || type;
};

interface AnalyticsStats {
  totalPageViews: number;
  uniqueVisitors: number;
  totalClicks: number;
  clicksByType: { type: string; count: number }[];
  topClickedItems: { targetName: string; targetType: string; count: number }[];
}

export default function AdminAnalyticsOverviewMobilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = useQuery<AnalyticsStats>({
    queryKey: ["/api/analytics/stats"],
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
      <div className="sticky top-0 z-50 bg-gradient-to-r from-primary to-accent border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/admin/analytics')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white">Visão Geral</h1>
            <p className="text-xs text-white/80">Métricas principais</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-6 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-pink-500 to-rose-500 text-white border-0">
            <CardContent className="p-4">
              <Eye className="w-6 h-6 opacity-80 mb-2" />
              <h3 className="text-xl font-bold">{stats?.totalPageViews.toLocaleString() || 0}</h3>
              <p className="text-white/80 text-xs">Visualizações</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white border-0">
            <CardContent className="p-4">
              <Users className="w-6 h-6 opacity-80 mb-2" />
              <h3 className="text-xl font-bold">{stats?.uniqueVisitors.toLocaleString() || 0}</h3>
              <p className="text-white/80 text-xs">Visitantes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white border-0">
            <CardContent className="p-4">
              <MousePointerClick className="w-6 h-6 opacity-80 mb-2" />
              <h3 className="text-xl font-bold">{stats?.totalClicks.toLocaleString() || 0}</h3>
              <p className="text-white/80 text-xs">Cliques</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-0">
            <CardContent className="p-4">
              <TrendingUp className="w-6 h-6 opacity-80 mb-2" />
              <h3 className="text-xl font-bold">
                {stats?.totalPageViews ? ((stats.totalClicks / stats.totalPageViews) * 100).toFixed(1) : 0}%
              </h3>
              <p className="text-white/80 text-xs">Taxa Conversão</p>
            </CardContent>
          </Card>
        </div>

        {/* Cliques por Tipo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-pink-500" />
              Cliques por Tipo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.clicksByType && stats.clicksByType.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.clicksByType.map(item => ({
                        ...item,
                        type: translateTargetType(item.type)
                      }))}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={(entry) => `${entry.type}: ${entry.count}`}
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
              <div className="h-[200px] flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum clique registrado</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Cupons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="w-5 h-5 text-pink-500" />
              Top Cupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Cupom</TableHead>
                  <TableHead className="text-right text-xs">Cliques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.topClickedItems?.filter(item => item.targetType === 'coupon').slice(0, 5).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-xs font-medium">{item.targetName}</TableCell>
                    <TableCell className="text-right text-xs">{item.count}</TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">
                      Nenhum dado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Banners */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="w-5 h-5 text-purple-500" />
              Top Banners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Banner</TableHead>
                  <TableHead className="text-right text-xs">Cliques</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats?.topClickedItems?.filter(item => item.targetType === 'banner').slice(0, 5).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-xs font-medium">{item.targetName}</TableCell>
                    <TableCell className="text-right text-xs">{item.count}</TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-xs text-muted-foreground py-4">
                      Nenhum dado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
