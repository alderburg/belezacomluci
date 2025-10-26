import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, ShoppingBag, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'wouter';
import { useDataSync } from '@/hooks/use-data-sync';
import { Product } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminProductsMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [, navigate] = useNavigate();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ebook': 'E-book',
      'course': 'Curso',
      'pdf': 'PDF',
      'checklist': 'Checklist'
    };
    return labels[type] || type;
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
            <h1 className="text-lg font-semibold text-foreground">Produtos Digitais</h1>
            <p className="text-sm text-muted-foreground">
              {products?.length || 0} produtos cadastrados
            </p>
          </div>
          <ShoppingBag className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-xl border border-border p-4"
                data-testid={`card-product-${product.id}`}
              >
                <div className="flex gap-3">
                  {product.coverImageUrl && (
                    <img
                      src={product.coverImageUrl}
                      alt={product.title}
                      className="w-24 h-24 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {product.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {product.isExclusive && (
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          Premium
                        </Badge>
                      )}
                      <Badge className="bg-blue-100 text-blue-700 text-xs">
                        {getProductTypeLabel(product.type)}
                      </Badge>
                      {!product.isActive && (
                        <Badge className="bg-red-100 text-red-700 text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    data-testid={`button-edit-${product.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    data-testid={`button-delete-${product.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum produto cadastrado</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        data-testid="button-add-product"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <MobileBottomNav />
    </div>
  );
}