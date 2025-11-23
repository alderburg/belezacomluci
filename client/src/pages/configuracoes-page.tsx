import { useLocation } from "wouter";
import { ArrowLeft, Bell, Key, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function ConfiguracoesPage() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/auth" />;
  }

  const configOptions = [
    {
      id: "notifications",
      title: "Notificações",
      description: "Configure alertas e preferências de notificação",
      icon: Bell,
      path: "/perfil/configuracoes/notificacoes",
      adminOnly: false,
    },
    {
      id: "apis",
      title: "APIs e Integrações",
      description: "Gerencie integrações com serviços externos",
      icon: Key,
      path: "/perfil/configuracoes/apis",
      adminOnly: true,
    },
  ];

  const filteredOptions = configOptions.filter(
    option => !option.adminOnly || user?.isAdmin
  );

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/perfil')}
              className="h-10 w-10"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Configurações</h1>
              <p className="text-muted-foreground">Gerencie suas preferências e integrações</p>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="max-w-3xl mx-auto grid gap-6 md:grid-cols-2">
            {filteredOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <Card
                  key={option.id}
                  className="hover-elevate cursor-pointer transition-all"
                  onClick={() => setLocation(option.path)}
                  data-testid={`card-${option.id}`}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{option.title}</CardTitle>
                    </div>
                    <CardDescription className="text-base">
                      {option.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="outline"
                      data-testid={`button-${option.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(option.path);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
