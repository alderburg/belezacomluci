import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import { ArrowLeft, Plus, Ticket, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useDataSync } from '@/hooks/use-data-sync';
import { Coupon } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

export default function AdminCouponsMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useDataSync();
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/admin/coupons/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      toast({
        title: "Sucesso!",
        description: "Cupom excluído com sucesso",
      });
      setCouponToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Erro ao excluir cupom",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin');
  };

  const handleCreateClick = () => {
    setLocation('/admin/coupons-mobile/new');
  };

  const handleEditClick = (couponId: string) => {
    setEditingId(couponId);
    setLocation(`/admin/coupons-mobile/edit/${couponId}`);
  };

  const handleDeleteClick = (coupon: Coupon) => {
    setCouponToDelete(coupon);
  };

  const confirmDelete = () => {
    if (couponToDelete) {
      deleteMutation.mutate(couponToDelete.id);
    }
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
            <h1 className="text-lg font-semibold text-foreground">Cupons</h1>
            <p className="text-sm text-muted-foreground">
              {coupons?.length || 0} cupons cadastrados
            </p>
          </div>
          <Ticket className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="pt-24 px-4 pb-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : coupons && coupons.length > 0 ? (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="bg-card rounded-xl border border-border p-4"
                data-testid={`card-coupon-${coupon.id}`}
              >
                <div className="flex gap-3">
                  {coupon.coverImageUrl && (
                    <img
                      src={coupon.coverImageUrl}
                      alt={coupon.brand}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {coupon.brand}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {coupon.description}
                    </p>
                    {coupon.isExclusive && (
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-purple-100 text-purple-700 text-xs">
                          Premium
                        </Badge>
                      </div>
                    )}
                    <div className="flex flex-col gap-2 mt-2">
                      {/* Linha 1: Badge de Posição */}
                      <div className="flex">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                          Posição: {coupon.order}
                        </Badge>
                      </div>
                      {/* Linha 2: Outros Badges */}
                      <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-green-100 text-green-700 text-xs">
                          {coupon.code}
                        </Badge>
                        {coupon.discount && coupon.discount.trim() !== '' && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            {coupon.discount}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {coupon.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditClick(coupon.id)}
                    disabled={editingId === coupon.id}
                    data-testid={`button-edit-${coupon.id}`}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    {editingId === coupon.id ? "Carregando..." : "Editar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDeleteClick(coupon)}
                    data-testid={`button-delete-${coupon.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum cupom cadastrado</p>
          </div>
        )}
      </div>

      <Button
        className="fixed bottom-32 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={handleCreateClick}
        data-testid="button-add-coupon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AlertDialog open={!!couponToDelete} onOpenChange={() => setCouponToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cupom da marca "{couponToDelete?.brand}"? Esta ação não pode ser desfeita.
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
