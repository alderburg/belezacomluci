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
import { useEffect } from 'react';

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

  const { data: category, isLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
    enabled: Boolean(isEditing && categoryId),
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
      form.reset({
        title: category.title,
        description: category.description || "",
        coverImageUrl: category.coverImageUrl || "",
        order: category.order || 0,
        isActive: category.isActive ?? true,
      });
    }
  }, [category, isEditing, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertCategorySchema>) => {
      if (isEditing) {
        return await apiRequest(`/api/categories/${categoryId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
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

  const handleBackClick = () => {
    setLocation('/admin/categories-mobile');
  };

  const onSubmit = (data: z.infer<typeof insertCategorySchema>) => {
    mutation.mutate(data);
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
          disabled={mutation.isPending}
          data-testid="button-save-category"
        >
          {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Categoria" : "Criar Categoria"}
        </Button>
        </form>
        </Form>
      )}
    </div>
  );
}