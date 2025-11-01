import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Redirect, useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCouponSchema, type Coupon } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import { useEffect, useState } from 'react';

export default function AdminCouponFormMobilePage() {
  const [match, params] = useRoute("/admin/coupons-mobile/edit/:id");
  const couponId = match && params && params.id ? String(params.id) : undefined;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(match && couponId);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<{ order: number; conflictCoupon?: Coupon } | null>(null);
  const [pendingFormData, setPendingFormData] = useState<z.infer<typeof insertCouponSchema> | null>(null);

  const { data: coupon, isLoading } = useQuery<Coupon>({
    queryKey: ['/api/admin/coupons', couponId],
    queryFn: async () => {
      if (!couponId) throw new Error('ID não fornecido');
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao carregar cupom');
      return res.json();
    },
    enabled: Boolean(isEditing && couponId),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const form = useForm<z.infer<typeof insertCouponSchema>>({
    resolver: zodResolver(insertCouponSchema),
    defaultValues: {
      code: "",
      brand: "",
      description: "",
      discount: "",
      categoryId: "",
      storeUrl: "",
      coverImageUrl: "",
      order: 0,
      startDateTime: "",
      endDateTime: "",
      isExclusive: false,
      isActive: true,
    },
  });

  // Reset form when coupon data loads or ID changes
  useEffect(() => {
    if (coupon && isEditing) {
      form.reset({
        code: coupon.code,
        brand: coupon.brand,
        description: coupon.description,
        discount: coupon.discount,
        categoryId: coupon.categoryId || "",
        storeUrl: coupon.storeUrl || "",
        coverImageUrl: coupon.coverImageUrl || "",
        order: coupon.order ?? 0,
        startDateTime: coupon.startDateTime ? 
          new Date(coupon.startDateTime).toISOString().slice(0, 16) : "",
        endDateTime: coupon.endDateTime ? 
          new Date(coupon.endDateTime).toISOString().slice(0, 16) : "",
        isExclusive: coupon.isExclusive ?? false,
        isActive: coupon.isActive ?? true,
      });
    } else if (!isEditing) {
      form.reset({
        code: "",
        brand: "",
        description: "",
        discount: "",
        categoryId: "",
        storeUrl: "",
        coverImageUrl: "",
        order: 0,
        startDateTime: "",
        endDateTime: "",
        isExclusive: false,
        isActive: true,
      });
    }
  }, [coupon, isEditing, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCouponSchema> & { shouldReorder?: boolean }) => {
      if (isEditing) {
        return await apiRequest('PUT', `/api/coupons/${couponId}`, data);
      } else {
        return await apiRequest('POST', '/api/coupons', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coupons'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/coupons'] });
      toast({
        title: "Sucesso!",
        description: isEditing ? "Cupom atualizado com sucesso" : "Cupom criado com sucesso",
      });
      setLocation('/admin/coupons-mobile');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || (isEditing ? "Erro ao atualizar cupom" : "Erro ao criar cupom"),
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/coupons-mobile');
  };

  const checkOrderConflict = async (order: number): Promise<{ hasConflict: boolean; conflict?: Coupon }> => {
    try {
      const url = isEditing 
        ? `/api/coupons/check-order/${order}?excludeId=${couponId}`
        : `/api/coupons/check-order/${order}`;
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Erro ao verificar conflito');
      return await response.json();
    } catch (error) {
      return { hasConflict: false };
    }
  };

  const onSubmit = async (data: z.infer<typeof insertCouponSchema>) => {
    if (data.order !== undefined && data.order >= 0) {
      const { hasConflict, conflict } = await checkOrderConflict(data.order);
      
      if (hasConflict && conflict) {
        setPendingFormData(data);
        setConflictData({ order: data.order, conflictCoupon: conflict });
        setShowConflictDialog(true);
        return;
      }
    }
    
    mutation.mutate(data);
  };

  const handleConfirmReorder = () => {
    if (pendingFormData) {
      mutation.mutate({ ...pendingFormData, shouldReorder: true });
    }
    setShowConflictDialog(false);
    setPendingFormData(null);
    setConflictData(null);
  };

  const handleCancelReorder = () => {
    setShowConflictDialog(false);
    setPendingFormData(null);
    setConflictData(null);
  };

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:bg-muted"
            onClick={handleBackClick}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Editar Cupom' : 'Novo Cupom'}
          </h1>
        </div>
      </div>

      {isEditing && isLoading ? (
        <div className="pt-20 px-4 flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="pt-20 px-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="coupon-code">Código <span className="text-destructive">*</span></Label>
            <Input
              id="coupon-code"
              {...form.register("code")}
              placeholder="DESCONTO20"
              data-testid="input-coupon-code"
            />
            {form.formState.errors.code && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.code.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="coupon-brand">Marca <span className="text-destructive">*</span></Label>
            <Input
              id="coupon-brand"
              {...form.register("brand")}
              placeholder="Nome da marca"
              data-testid="input-coupon-brand"
            />
            {form.formState.errors.brand && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.brand.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="coupon-description">Descrição</Label>
          <Input
            id="coupon-description"
            {...form.register("description")}
            placeholder="Descrição do desconto"
            data-testid="input-coupon-description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="coupon-discount">Desconto</Label>
            <Input
              id="coupon-discount"
              {...form.register("discount")}
              placeholder="20% OFF"
              data-testid="input-coupon-discount"
            />
          </div>

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-coupon-category">
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories?.filter((cat: any) => cat.isActive).map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          <Label htmlFor="coupon-store">URL da Loja <span className="text-destructive">*</span></Label>
          <Input
            id="coupon-store"
            {...form.register("storeUrl")}
            placeholder="https://..."
            data-testid="input-coupon-store"
          />
          {form.formState.errors.storeUrl && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.storeUrl.message}</p>
          )}
        </div>

        <div>
          <ImageUpload
            id="coupon-cover"
            label="Imagem de Capa"
            value={form.watch("coverImageUrl")}
            onChange={(base64) => form.setValue("coverImageUrl", base64)}
            placeholder="Selecionar imagem de capa"
          />
        </div>

        <div>
          <Label htmlFor="coupon-order">Ordem de Exibição</Label>
          <Input
            id="coupon-order"
            type="number"
            {...form.register("order", { valueAsNumber: true })}
            placeholder="0"
            data-testid="input-coupon-order"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="coupon-start">Data/Hora de Início</Label>
            <Input
              id="coupon-start"
              type="datetime-local"
              {...form.register("startDateTime")}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  form.setValue("startDateTime", "");
                }
              }}
              data-testid="input-coupon-start-datetime"
            />
          </div>

          <div>
            <Label htmlFor="coupon-end">Data/Hora de Fim</Label>
            <Input
              id="coupon-end"
              type="datetime-local"
              {...form.register("endDateTime")}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  form.setValue("endDateTime", "");
                }
              }}
              data-testid="input-coupon-end-datetime"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("isExclusive") || false}
              onCheckedChange={(checked) => form.setValue("isExclusive", checked)}
              data-testid="switch-coupon-exclusive"
            />
            <Label>Conteúdo Exclusivo</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("isActive") || false}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
              data-testid="switch-coupon-active"
            />
            <Label>Cupom Ativo</Label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={mutation.isPending}
          data-testid="button-save-coupon"
        >
          {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Cupom" : "Criar Cupom"}
        </Button>
        </form>
        </Form>
      )}

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent data-testid="dialog-order-conflict">
          <AlertDialogHeader>
            <AlertDialogTitle>Conflito de Ordem de Exibição</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um cupom cadastrado com a posição de exibição número {conflictData?.order}.
              {conflictData?.conflictCoupon && (
                <span className="block mt-2 font-medium">
                  Cupom atual: {conflictData.conflictCoupon.brand}
                </span>
              )}
              <span className="block mt-2">
                Ao confirmar, todos os cupons a partir da posição {conflictData?.order} serão incrementados em 1 posição para frente.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancelReorder}
              data-testid="button-cancel-reorder"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReorder}
              data-testid="button-confirm-reorder"
            >
              Confirmar e Reordenar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
