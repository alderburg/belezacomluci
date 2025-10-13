import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useLocation } from "wouter";
import { ArrowLeft, Mail, MessageCircle, Smartphone, Volume2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataSync } from "@/hooks/use-data-sync";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Sidebar from "@/components/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

async function fetchNotificationSettings() {
  const res = await fetch("/api/notification-settings");
  if (!res.ok) {
    throw new Error("Failed to fetch notification settings");
  }
  return res.json();
}

async function saveNotificationSettings(settings: {
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  soundEnabled: boolean;
}) {
  const res = await fetch("/api/notification-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    throw new Error("Failed to save notification settings");
  }
  return res.json();
}

export default function NotificationSettingsPage() {
  useDataSync();
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/notification-settings"],
    queryFn: fetchNotificationSettings,
    enabled: !!user,
  });

  useEffect(() => {
    if (settings) {
      setEmailEnabled(settings.emailEnabled ?? true);
      setWhatsappEnabled(settings.whatsappEnabled ?? false);
      setSmsEnabled(settings.smsEnabled ?? false);
      setSoundEnabled(settings.soundEnabled ?? true);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: saveNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-settings"] });
      toast({
        title: "Configurações salvas",
        description: "Suas preferências de notificação foram atualizadas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEnabled(checked);
    if (checked) {
      playNotificationSound();
    }
  };

  const handleSave = () => {
    saveMutation.mutate({
      emailEnabled,
      whatsappEnabled,
      smsEnabled,
      soundEnabled,
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/perfil')}
              className="h-10 w-10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold gradient-text">Configurações de Notificação</h1>
              <p className="text-muted-foreground">Gerencie como você recebe alertas</p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preferências de Notificação
                </CardTitle>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-lg" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-3 w-40" />
                            </div>
                          </div>
                          <Skeleton className="w-11 h-6 rounded-full" />
                        </div>
                      ))}
                    </div>
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-pink-100/50 border border-pink-200/50 rounded-lg">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-foreground">E-mail</h3>
                          <p className="text-xs text-muted-foreground">Receba notificações por e-mail</p>
                        </div>
                      </div>
                      <Switch
                        checked={emailEnabled}
                        onCheckedChange={setEmailEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-pink-100/50 border border-pink-200/50 rounded-lg">
                          <MessageCircle className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-foreground">WhatsApp</h3>
                          <p className="text-xs text-muted-foreground">Receba notificações no WhatsApp</p>
                        </div>
                      </div>
                      <Switch
                        checked={whatsappEnabled}
                        onCheckedChange={setWhatsappEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-pink-100/50 border border-pink-200/50 rounded-lg">
                          <Smartphone className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-foreground">SMS</h3>
                          <p className="text-xs text-muted-foreground">Receba notificações por SMS</p>
                        </div>
                      </div>
                      <Switch
                        checked={smsEnabled}
                        onCheckedChange={setSmsEnabled}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-pink-100/50 border border-pink-200/50 rounded-lg">
                          <Volume2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-foreground">Som</h3>
                          <p className="text-xs text-muted-foreground">Habilitar som para notificações no sino</p>
                        </div>
                      </div>
                      <Switch
                        checked={soundEnabled}
                        onCheckedChange={handleSoundToggle}
                      />
                    </div>

                    <Button 
                      onClick={handleSave}
                      disabled={saveMutation.isPending}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-6"
                    >
                      {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  );
}
