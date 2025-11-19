import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { useLocation, useRoute, Redirect } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCategorySchema, type Category } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import type { z } from 'zod';
import { useEffect, useState } from 'react';

export default function AdminCategoryFormMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/admin/categories-mobile/edit/:id");
  const categoryId = match && params && params.id ? String(params.id) : undefined;
  const isEditing = Boolean(match && categoryId);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingData, setPendingData] = useState<z.infer<typeof insertCategorySchema> | null>(null);
  const [conflictingCategory, setConflictingCategory] = useState<Category | null>(null);
  const [originalOrder, setOriginalOrder] = useState<number | null>(null);

  const { data: category, isLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
    enabled: Boolean(isEditing && categoryId),
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<z.infer<typeof insertCategorySchema>>({
    resolver: zodResolver(insertCategorySchema),
    defaultValues: {
      title: "",
      description: "",
      coverImageUrl: "",
      order: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (category && isEditing) {
      const orderValue = category.order || 0;
      setOriginalOrder(orderValue);
      form.reset({
        title: category.title,
        description: category.description || "",
        coverImageUrl: category.coverImageUrl || "",
        order: orderValue,
        isActive: category.isActive ?? true,
      });
    } else if (!isEditing && categories) {
      if (categories.length === 0) {
        form.setValue("order", 0);
      } else {
        const maxOrder = categories.reduce((max, cat) => Math.max(max, cat.order || 0), 0);
        form.setValue("order", maxOrder + 1);
      }
    }
  }, [category, isEditing, categories, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCategorySchema>) => {
      if (isEditing) {
        return await apiRequest('PUT', `/api/categories/${categoryId}`, data);
      } else {
        return await apiRequest('POST', '/api/categories', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      // Invalidar também a query específica desta categoria
      if (isEditing && categoryId) {
        queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}`] });
      }
      toast({
        title: "Sucesso",
        description: isEditing ? "Categoria atualizada!" : "Categoria criada!",
      });
      setLocation('/admin/categories-mobile');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar categoria",
        variant: "destructive",
      });
    },
  });

  const reorganizeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCategorySchema>) => {
      if (!categories) return;

      const newOrder = data.order || 0;
      const oldOrder = originalOrder ?? -1;

      // Reorganizar todas as categorias afetadas
      const updates: Promise<any>[] = [];

      if (isEditing) {
        // Modo edição: movendo de oldOrder para newOrder
        if (newOrder < oldOrder) {
          // Movendo para cima: empurrar para baixo as categorias entre newOrder e oldOrder
          categories.forEach(cat => {
            if (cat.id !== categoryId && cat.order !== null && cat.order !== undefined) {
              if (cat.order >= newOrder && cat.order < oldOrder) {
                updates.push(
                  apiRequest('PUT', `/api/categories/${cat.id}`, {
                    ...cat,
                    order: cat.order + 1,
                  })
                );
              }
            }
          });
        } else if (newOrder > oldOrder) {
          // Movendo para baixo: empurrar para cima as categorias entre oldOrder e newOrder
          categories.forEach(cat => {
            if (cat.id !== categoryId && cat.order !== null && cat.order !== undefined) {
              if (cat.order > oldOrder && cat.order <= newOrder) {
                updates.push(
                  apiRequest('PUT', `/api/categories/${cat.id}`, {
                    ...cat,
                    order: cat.order - 1,
                  })
                );
              }
            }
          });
        }
      } else {
        // Modo criação: empurrar para baixo todas as categorias >= newOrder
        categories.forEach(cat => {
          if (cat.order !== null && cat.order !== undefined && cat.order >= newOrder) {
            updates.push(
              apiRequest('PUT', `/api/categories/${cat.id}`, {
                ...cat,
                order: cat.order + 1,
              })
            );
          }
        });
      }

      // Executar todas as atualizações em paralelo
      await Promise.all(updates);

      // Agora criar/atualizar a categoria principal
      if (isEditing) {
        return await apiRequest('PUT', `/api/categories/${categoryId}`, data);
      } else {
        return await apiRequest('POST', '/api/categories', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      // Invalidar também a query específica desta categoria
      if (isEditing && categoryId) {
        queryClient.invalidateQueries({ queryKey: [`/api/categories/${categoryId}`] });
      }
      toast({
        title: "Sucesso",
        description: isEditing ? "Categoria atualizada e categorias reorganizadas!" : "Categoria criada e categorias reorganizadas!",
      });
      setShowConflictDialog(false);
      setPendingData(null);
      setConflictingCategory(null);
      setLocation('/admin/categories-mobile');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao reorganizar categorias",
        variant: "destructive",
      });
      setShowConflictDialog(false);
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/categories-mobile');
  };

  const onSubmit = (data: z.infer<typeof insertCategorySchema>) => {
    if (isEditing && data.order === originalOrder) {
      mutation.mutate(data);
      return;
    }

    const conflicting = categories?.find(
      cat => cat.order === data.order && cat.id !== categoryId
    );

    if (conflicting) {
      setPendingData(data);
      setConflictingCategory(conflicting);
      setShowConflictDialog(true);
    } else {
      mutation.mutate(data);
    }
  };

  const handleConfirmReorganize = () => {
    if (pendingData) {
      reorganizeMutation.mutate(pendingData);
    }
  };

  const handleCancelReorganize = () => {
    setShowConflictDialog(false);
    setPendingData(null);
    setConflictingCategory(null);
  };

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
            {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
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
        <div>
          <Label htmlFor="category-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="category-title"
            {...form.register("title")}
            placeholder="Digite o título da categoria"
            data-testid="input-category-title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="category-description">Descrição</Label>
          <Textarea
            id="category-description"
            {...form.register("description")}
            placeholder="Descrição da categoria"
            data-testid="textarea-category-description"
          />
        </div>

        <ImageUpload
          id="category-cover-image"
          label="Imagem de Capa da Categoria"
          value={form.watch("coverImageUrl")}
          onChange={(base64) => form.setValue("coverImageUrl", base64)}
          placeholder="Selecionar imagem de capa"
        />

        <div>
          <Label htmlFor="category-order">Ordem de Exibição</Label>
          <Input
            id="category-order"
            type="number"
            {...form.register("order", { valueAsNumber: true })}
            placeholder="0"
            data-testid="input-category-order"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={form.watch("isActive") ?? true}
            onCheckedChange={(checked) => form.setValue("isActive", checked)}
            data-testid="switch-category-active"
          />
          <Label>Categoria Ativa</Label>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={mutation.isPending || reorganizeMutation.isPending}
          data-testid="button-save-category"
        >
          {reorganizeMutation.isPending ? "Reorganizando..." : mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Categoria" : "Criar Categoria"}
        </Button>
        </form>
        </Form>
      )}

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="mx-auto w-[calc(100vw-32px)] sm:max-w-sm rounded-2xl border-0 shadow-xl p-4">
          <AlertDialogHeader className="text-center space-y-2">
            <AlertDialogTitle>Conflito de Posição</AlertDialogTitle>
            <AlertDialogDescription>
              A posição {pendingData?.order} já está ocupada pela categoria "{conflictingCategory?.title}".
              Deseja reorganizar automaticamente as categorias?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row items-center justify-center gap-2 mt-4 sm:space-y-0">
            <AlertDialogCancel 
              onClick={handleCancelReorganize}
              className="flex-1 h-10 rounded-xl flex items-center justify-center border border-input bg-background text-foreground hover:bg-muted mt-0"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReorganize}
              className="flex-1 h-10 rounded-xl flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 mt-0"
              disabled={reorganizeMutation.isPending}
            >
              {reorganizeMutation.isPending ? "Reorganizando..." : "Reorganizar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}