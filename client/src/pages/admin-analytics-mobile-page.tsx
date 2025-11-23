
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Activity, TrendingUp, Target, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminAnalyticsMobilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

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

  const menuItems = [
    {
      title: "Visão Geral",
      description: "KPIs e métricas principais",
      icon: Activity,
      path: "/admin/analytics/overview",
      color: "from-pink-500 to-rose-500"
    },
    {
      title: "Engajamento",
      description: "Cliques e conversões",
      icon: TrendingUp,
      path: "/admin/analytics/engagement",
      color: "from-purple-500 to-indigo-500"
    },
    {
      title: "Geografia",
      description: "Localização dos usuários",
      icon: MapPin,
      path: "/admin/analytics/geographic",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Timeline",
      description: "Histórico detalhado",
      icon: Clock,
      path: "/admin/analytics/timeline",
      color: "from-emerald-500 to-teal-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gradient-to-r from-primary to-accent border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/admin')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-white">Analytics</h1>
            <p className="text-xs text-white/80">Métricas e estatísticas</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-6 space-y-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.path}
              className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLocation(item.path)}
            >
              <div className={`h-2 bg-gradient-to-r ${item.color}`} />
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="text-xs">{item.description}</CardDescription>
                  </div>
                  <Target className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </main>
    </div>
  );
}
