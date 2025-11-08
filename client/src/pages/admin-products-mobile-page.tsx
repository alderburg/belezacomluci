import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, ShoppingBag, Edit, Trash2, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/hooks/use-data-sync';
import { Product } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { apiRequest } from '@/lib/queryClient';
import { useEffect } from "react";

export default function AdminProductsMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: "Sucesso!",
        description: "Produto excluído com sucesso",
      });
      setProductToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao excluir produto",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  const handleCreateClick = () => {
    setLocation('/admin/products-mobile/new');
  };

  const handleEditClick = (productId: string) => {
    setEditingId(productId);
    setTimeout(() => {
      setLocation(`/admin/products-mobile/edit/${productId}`);
      setEditingId(null);
    }, 100);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'ebook': 'E-book',
      'course': 'Curso',
      'course_video': 'Curso - Vídeo',
      'course_playlist': 'Curso - Playlist',
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

      <div className="pt-24 px-4 pb-24">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="space-y-3">
            {products
              .filter(product => 
                product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((product) => (
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
                    {product.isExclusive && (
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          Premium
                        </Badge>
                      </div>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Badge className={`text-xs ${product.type === 'course_playlist' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {getProductTypeLabel(product.type)}
                      </Badge>
                      <Badge className={`text-xs ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {product.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditClick(product.id)}
                    disabled={editingId === product.id}
                    data-testid={`button-edit-${product.id}`}
                  >
                    {editingId === product.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Edit className="h-4 w-4 mr-2" />
                    )}
                    {editingId === product.id ? "Carregando..." : "Editar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDeleteClick(product)}
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
        onClick={handleCreateClick}
        data-testid="button-add-product"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto "{productToDelete?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MobileBottomNav />
    </div>
  );
}