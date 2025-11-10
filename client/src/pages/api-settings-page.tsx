
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Youtube, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ApiSettingsPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const youtubeApiConfigured = !!(
    import.meta.env.VITE_YOUTUBE_API_KEY && 
    import.meta.env.VITE_YOUTUBE_CHANNEL_ID
  );

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0 pt-32' : 'pt-16'}`}>
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
            {/* YouTube API */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <Youtube className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <CardTitle>YouTube Data API v3</CardTitle>
                      <CardDescription>
                        Sincronização automática de vídeos do canal
                      </CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant={youtubeApiConfigured ? "default" : "secondary"}
                    className={youtubeApiConfigured ? "bg-green-100 text-green-700" : ""}
                  >
                    {youtubeApiConfigured ? "Configurado" : "Não configurado"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-3">
                  <div className="flex items-start gap-2">
                    <Key className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">VITE_YOUTUBE_API_KEY</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {import.meta.env.VITE_YOUTUBE_API_KEY ? (
                          <span className="text-green-600">✓ Configurada</span>
                        ) : (
                          <span className="text-orange-600">✗ Não configurada</span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Key className="w-4 h-4 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">VITE_YOUTUBE_CHANNEL_ID</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {import.meta.env.VITE_YOUTUBE_CHANNEL_ID ? (
                          <span className="text-green-600">✓ Configurado: {import.meta.env.VITE_YOUTUBE_CHANNEL_ID}</span>
                        ) : (
                          <span className="text-orange-600">✗ Não configurado</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-sm text-blue-900 mb-2">Como configurar:</h4>
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Google Cloud Console</a></li>
                    <li>Crie um novo projeto ou selecione um existente</li>
                    <li>Ative a YouTube Data API v3</li>
                    <li>Crie credenciais (API Key)</li>
                    <li>Adicione as variáveis no arquivo <code className="bg-blue-100 px-1 rounded">.env</code> do seu projeto</li>
                    <li>Reinicie a aplicação para aplicar as mudanças</li>
                  </ol>
                </div>
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

