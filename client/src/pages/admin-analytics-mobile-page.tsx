
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Activity, TrendingUp, MapPin, Clock, Settings, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileBottomNav from "@/components/mobile-bottom-nav";

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
      id: "overview",
      title: "Visão Geral",
      subtitle: "KPIs e métricas principais",
      icon: Activity,
      path: "/admin/analytics/overview"
    },
    {
      id: "engagement",
      title: "Engajamento",
      subtitle: "Cliques e conversões",
      icon: TrendingUp,
      path: "/admin/analytics/engagement"
    },
    {
      id: "geographic",
      title: "Geografia",
      subtitle: "Localização dos usuários",
      icon: MapPin,
      path: "/admin/analytics/geographic"
    },
    {
      id: "timeline",
      title: "Timeline",
      subtitle: "Histórico detalhado",
      icon: Clock,
      path: "/admin/analytics/timeline"
    }
  ];

  const handleBackClick = () => {
    setLocation('/admin');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Métricas e estatísticas</p>
          </div>
          <Settings className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Título Analytics */}
      <div className="px-4 pt-24 pb-2">
        <h3 className="text-lg font-semibold text-foreground">Analytics</h3>
        <p className="text-sm text-muted-foreground">Selecione uma seção para visualizar</p>
      </div>

      {/* Menu Items */}
      <div className="px-4 py-2">
        <div className="space-y-3">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setLocation(item.path)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-pink-100/50 border border-pink-200/50 rounded-lg shadow-sm">
                  <IconComponent className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-base font-medium text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
