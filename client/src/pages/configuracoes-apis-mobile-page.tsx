import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Youtube, Key, Eye, EyeOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertApiSettingsSchema } from "@shared/schema";
import type { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";

type ApiSettingsData = z.infer<typeof insertApiSettingsSchema>;

export default function ConfiguracoesApisMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showSecrets, setShowSecrets] = useState({
    googleClientId: false,
    googleClientSecret: false,
    youtubeApiKey: false,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/api-settings"],
    enabled: !!user?.isAdmin,
  });

  const form = useForm<ApiSettingsData>({
    resolver: zodResolver(insertApiSettingsSchema),
    defaultValues: {
      googleClientId: "",
      googleClientSecret: "",
      youtubeApiKey: "",
      youtubeChannelId: "",
      userId: user?.id || "",
    },
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (settings) {
      form.reset({
        googleClientId: settings.googleClientId || "",
        googleClientSecret: settings.googleClientSecret || "",
        youtubeApiKey: settings.youtubeApiKey || "",
        youtubeChannelId: settings.youtubeChannelId || "",
        userId: settings.userId || user?.id || "",
      });
    }
  }, [settings, form, user]);

  const saveMutation = useMutation({
    mutationFn: async (data: ApiSettingsData) => {
      const response = await fetch("/api/api-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save API settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-settings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações de API foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const handleSubmit = form.handleSubmit((data) => {
    saveMutation.mutate(data);
  });

  const handleBackClick = () => {
    setLocation('/mobile-menu');
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
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Configurações de APIs</h1>
            <p className="text-sm text-muted-foreground">Gerencie integrações externas</p>
          </div>
          <Settings className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pt-24 pb-4">
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Google Credentials Section */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-10 h-10 bg-pink-100/50 border border-pink-200/50 rounded-lg">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Google OAuth</h3>
                  <p className="text-xs text-muted-foreground">Credenciais de autenticação</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleClientId">Client ID</Label>
                <div className="relative">
                  <Input
                    id="googleClientId"
                    type={showSecrets.googleClientId ? "text" : "password"}
                    {...form.register("googleClientId")}
                    placeholder="Client ID do Google"
                    className="pr-10"
                    data-testid="input-google-client-id"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() =>
                      setShowSecrets((prev) => ({
                        ...prev,
                        googleClientId: !prev.googleClientId,
                      }))
                    }
                  >
                    {showSecrets.googleClientId ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="googleClientSecret">Client Secret</Label>
                <div className="relative">
                  <Input
                    id="googleClientSecret"
                    type={showSecrets.googleClientSecret ? "text" : "password"}
                    {...form.register("googleClientSecret")}
                    placeholder="Client Secret do Google"
                    className="pr-10"
                    data-testid="input-google-client-secret"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() =>
                      setShowSecrets((prev) => ({
                        ...prev,
                        googleClientSecret: !prev.googleClientSecret,
                      }))
                    }
                  >
                    {showSecrets.googleClientSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* YouTube API Section */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center justify-center w-10 h-10 bg-pink-100/50 border border-pink-200/50 rounded-lg">
                  <Youtube className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">YouTube Data API</h3>
                  <p className="text-xs text-muted-foreground">Configurações do YouTube</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtubeApiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="youtubeApiKey"
                    type={showSecrets.youtubeApiKey ? "text" : "password"}
                    {...form.register("youtubeApiKey")}
                    placeholder="API Key do YouTube"
                    className="pr-10"
                    data-testid="input-youtube-api-key"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() =>
                      setShowSecrets((prev) => ({
                        ...prev,
                        youtubeApiKey: !prev.youtubeApiKey,
                      }))
                    }
                  >
                    {showSecrets.youtubeApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtubeChannelId">Channel ID</Label>
                <Input
                  id="youtubeChannelId"
                  type="text"
                  {...form.register("youtubeChannelId")}
                  placeholder="ID do Canal do YouTube"
                  data-testid="input-youtube-channel-id"
                />
              </div>
            </div>

            {/* Save Button */}
            <Button
              type="submit"
              className="w-full bg-[#e92066] text-white hover:bg-[#d11a5a] h-12 rounded-xl"
              disabled={saveMutation.isPending}
              data-testid="button-save"
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </form>
        )}
      </main>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
