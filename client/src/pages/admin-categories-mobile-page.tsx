import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, FolderTree, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/hooks/use-data-sync';
import { Category } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCategoriesMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const handleBackClick = () => {
    setLocation('/admin');
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
            <h1 className="text-lg font-semibold text-foreground">Categorias</h1>
            <p className="text-sm text-muted-foreground">
              {categories?.length || 0} categorias cadastradas
            </p>
          </div>
          <FolderTree className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-card rounded-xl border border-border p-4"
                data-testid={`card-category-${category.id}`}
              >
                <div className="flex gap-3">
                  {category.coverImageUrl && (
                    <img
                      src={category.coverImageUrl}
                      alt={category.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid={`button-edit-${category.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    data-testid={`button-delete-${category.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma categoria cadastrada</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        data-testid="button-add-category"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <MobileBottomNav />
    </div>
  );
}