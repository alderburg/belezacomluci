
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft } from "lucide-react";
import { YouTubeSyncContent } from "@/components/youtube-sync-content";
import { AutoYouTubeCheck } from "@/components/auto-youtube-check";
import { useEffect } from "react";

export default function AdminYouTubeSyncMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const handleBackClick = () => {
    setLocation('/admin/videos-mobile');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-2">
            <h1 className="text-lg font-semibold text-foreground">Sincronizar YouTube</h1>
            <p className="text-sm text-muted-foreground">
              Importar vídeos do canal
            </p>
          </div>
        </div>
      </div>

      <div className="pt-20 px-4 pb-24">
        <div className="mb-4">
          <AutoYouTubeCheck mode="inline" />
        </div>
        
        <YouTubeSyncContent
          mode="inline"
          onCancel={handleBackClick}
          onSuccess={handleBackClick}
          initialSync={true}
        />
      </div>

      <MobileBottomNav />
    </div>
  );
}
