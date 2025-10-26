import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, MessageSquare, Edit, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Popup } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminPopupsMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: popups, isLoading } = useQuery<Popup[]>({
    queryKey: ["/api/admin/popups"],
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      'login': 'Login',
      'page_visit': 'Visita',
      'time_based': 'Tempo',
      'scheduled': 'Agendado'
    };
    return labels[trigger] || trigger;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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
            <h1 className="text-lg font-semibold text-foreground">Pop-ups</h1>
            <p className="text-sm text-muted-foreground">
              {popups?.length || 0} pop-ups cadastrados
            </p>
          </div>
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : popups && popups.length > 0 ? (
          <div className="space-y-3">
            {popups.map((popup) => (
              <div
                key={popup.id}
                className="bg-card rounded-xl border border-border overflow-hidden"
                data-testid={`card-popup-${popup.id}`}
              >
                {popup.imageUrl && (
                  <img
                    src={popup.imageUrl}
                    alt={popup.title}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-4">
                  <h3 className="font-medium text-foreground truncate">
                    {popup.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {popup.description}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {getTriggerLabel(popup.trigger)}
                    </Badge>
                    {popup.isExclusive && (
                      <Badge variant="secondary" className="text-xs">
                        Premium
                      </Badge>
                    )}
                    {!popup.isActive && (
                      <Badge variant="destructive" className="text-xs">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-edit-${popup.id}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      data-testid={`button-delete-${popup.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pop-up cadastrado</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        data-testid="button-add-popup"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <MobileBottomNav />
    </div>
  );
}
