
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Youtube, Key, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ApiSettingsData {
  googleClientId: string;
  googleClientSecret: string;
  youtubeApiKey: string;
  youtubeChannelId: string;
}

export default function ApiSettingsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ApiSettingsData>({
    googleClientId: "",
    googleClientSecret: "",
    youtubeApiKey: "",
    youtubeChannelId: "",
  });

  const [showSecrets, setShowSecrets] = useState({
    googleClientId: false,
    googleClientSecret: false,
    youtubeApiKey: false,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/api-settings"],
    enabled: !!user?.isAdmin,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        googleClientId: settings.googleClientId || "",
        googleClientSecret: settings.googleClientSecret || "",
        youtubeApiKey: settings.youtubeApiKey || "",
        youtubeChannelId: settings.youtubeChannelId || "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: ApiSettingsData) => {
      const response = await fetch("/api/api-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to save API settings");
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
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
        <TopBar />
        
        <div className="container mx-auto px-6 py-8">
          <div className="mb-6 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/perfil/configuracoes')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-foreground">Configurações de APIs</h2>
              <p className="text-muted-foreground">Gerencie as integrações com serviços externos</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* YouTube & Google APIs */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Youtube className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle>YouTube & Google APIs</CardTitle>
                    <CardDescription>
                      Configure as credenciais para sincronização automática de vídeos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Carregando configurações...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Google Client ID */}
                    <div className="space-y-2">
                      <Label htmlFor="google-client-id">
                        Google Client ID <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="google-client-id"
                          type={showSecrets.googleClientId ? "text" : "password"}
                          value={formData.googleClientId}
                          onChange={(e) => setFormData({ ...formData, googleClientId: e.target.value })}
                          placeholder="Digite o Google Client ID"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets({ ...showSecrets, googleClientId: !showSecrets.googleClientId })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets.googleClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Google Client Secret */}
                    <div className="space-y-2">
                      <Label htmlFor="google-client-secret">
                        Google Client Secret <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="google-client-secret"
                          type={showSecrets.googleClientSecret ? "text" : "password"}
                          value={formData.googleClientSecret}
                          onChange={(e) => setFormData({ ...formData, googleClientSecret: e.target.value })}
                          placeholder="Digite o Google Client Secret"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets({ ...showSecrets, googleClientSecret: !showSecrets.googleClientSecret })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets.googleClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* YouTube API Key */}
                    <div className="space-y-2">
                      <Label htmlFor="youtube-api-key">
                        YouTube API Key <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="youtube-api-key"
                          type={showSecrets.youtubeApiKey ? "text" : "password"}
                          value={formData.youtubeApiKey}
                          onChange={(e) => setFormData({ ...formData, youtubeApiKey: e.target.value })}
                          placeholder="Digite a YouTube API Key"
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecrets({ ...showSecrets, youtubeApiKey: !showSecrets.youtubeApiKey })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecrets.youtubeApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* YouTube Channel ID */}
                    <div className="space-y-2">
                      <Label htmlFor="youtube-channel-id">
                        YouTube Channel ID <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="youtube-channel-id"
                        type="text"
                        value={formData.youtubeChannelId}
                        onChange={(e) => setFormData({ ...formData, youtubeChannelId: e.target.value })}
                        placeholder="Digite o YouTube Channel ID"
                      />
                    </div>

                    {/* Instruções */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-sm text-blue-900 mb-2">Como configurar:</h4>
                      <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                        <li>
                          Acesse o{" "}
                          <a
                            href="https://console.cloud.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-blue-600"
                          >
                            Google Cloud Console
                          </a>
                        </li>
                        <li>Crie um novo projeto ou selecione um existente</li>
                        <li>Ative a YouTube Data API v3 no seu projeto</li>
                        <li>Crie credenciais OAuth 2.0 para obter Client ID e Client Secret, e também uma API Key</li>
                      </ol>
                    </div>

                    {/* Botão Salvar */}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Placeholder para outras APIs futuras */}
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Outras integrações estarão disponíveis em breve</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
