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
import { Redirect, useParams, useLocation } from "wouter";
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
import { useEffect } from 'react';

export default function AdminCouponFormMobilePage() {
  const { id: couponId } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(couponId);

  const { data: coupon, isLoading } = useQuery<Coupon>({
    queryKey: [`/api/admin/coupons/${couponId}`],
    enabled: isEditing,
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

  // Reset form when coupon data loads
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
    }
  }, [coupon, isEditing, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCouponSchema>) => {
      if (isEditing) {
        return await apiRequest(`/api/admin/coupons/${couponId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return await apiRequest('/api/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
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

  const onSubmit = (data: z.infer<typeof insertCouponSchema>) => {
    mutation.mutate(data);
  };

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
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

          <div>
            <Label htmlFor="coupon-category">Categoria <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch("categoryId") || ""}
              onValueChange={(value) => form.setValue("categoryId", value)}
            >
              <SelectTrigger data-testid="select-coupon-category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories?.filter((cat: any) => cat.isActive).map((category: any) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.categoryId.message}</p>
            )}
          </div>
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
    </div>
  );
}
