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
import { insertBannerSchema, type Banner } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import type { z } from 'zod';
import { useEffect } from 'react';

export default function AdminBannerFormMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/admin/banners-mobile/edit/:id");
  const bannerId = match && params && params.id ? String(params.id) : undefined;
  const isEditing = Boolean(match && bannerId);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: banner, isLoading } = useQuery<Banner>({
    queryKey: [`/api/admin/banners/${bannerId}`],
    enabled: Boolean(isEditing && bannerId),
  });

  const form = useForm<z.infer<typeof insertBannerSchema>>({
    resolver: zodResolver(insertBannerSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      page: "home",
      order: 0,
      showTitle: true,
      showDescription: true,
      showButton: true,
      isActive: false,
      opensCouponsModal: false,
      startDateTime: "",
      endDateTime: "",
      videoId: "",
    },
  });

  useEffect(() => {
    if (banner && isEditing) {
      form.reset({
        title: banner.title,
        description: banner.description,
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl || "",
        page: banner.page,
        order: banner.order,
        showTitle: banner.showTitle ?? true,
        showDescription: banner.showDescription ?? true,
        showButton: banner.showButton ?? true,
        isActive: banner.isActive,
        opensCouponsModal: banner.opensCouponsModal ?? false,
        startDateTime: banner.startDateTime ?
          new Date(banner.startDateTime).toISOString().slice(0, 16) : "",
        endDateTime: banner.endDateTime ?
          new Date(banner.endDateTime).toISOString().slice(0, 16) : "",
        videoId: banner.videoId || "",
      });
    }
  }, [banner, isEditing, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertBannerSchema>) => {
      if (isEditing) {
        return await apiRequest('PUT', `/api/banners/${bannerId}`, data);
      } else {
        return await apiRequest('POST', '/api/banners', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      toast({
        title: "Sucesso",
        description: isEditing ? "Banner atualizado!" : "Banner criado!",
      });
      setLocation('/admin/banners-mobile');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar banner",
        variant: "destructive",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/banners-mobile');
  };

  const onSubmit = (data: z.infer<typeof insertBannerSchema>) => {
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
            {isEditing ? 'Editar Banner' : 'Novo Banner'}
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
          <Label htmlFor="banner-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="banner-title"
            {...form.register("title")}
            placeholder="Digite o título do banner"
            data-testid="input-banner-title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="banner-description">Descrição <span className="text-destructive">*</span></Label>
          <Textarea
            id="banner-description"
            {...form.register("description")}
            placeholder="Descrição do banner"
            data-testid="textarea-banner-description"
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div>
          <ImageUpload
            id="banner-image"
            label="Imagem do Banner"
            value={form.watch("imageUrl")}
            onChange={(base64) => form.setValue("imageUrl", base64)}
            placeholder="Selecionar imagem do banner"
            required
          />
          {form.formState.errors.imageUrl && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.imageUrl.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="banner-link">URL de Destino</Label>
          <Input
            id="banner-link"
            {...form.register("linkUrl")}
            placeholder="https://..."
            data-testid="input-banner-link"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="banner-order">Ordem</Label>
            <Input
              id="banner-order"
              type="number"
              {...form.register("order", { valueAsNumber: true })}
              placeholder="0"
              data-testid="input-banner-order"
            />
          </div>

          <div>
            <Label htmlFor="banner-page">Página</Label>
            <select
              id="banner-page"
              {...form.register("page")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="select-banner-page"
            >
              <option value="home">Página Inicial</option>
              <option value="videos">Vídeos Exclusivos</option>
              <option value="products">Produtos Digitais</option>
              <option value="coupons">Cupons</option>
              <option value="community">Comunidade</option>
              <option value="profile">Perfil</option>
              <option value="bio">Link da Bio</option>
              <option value="video_specific">Video Específico</option>
            </select>
          </div>
        </div>

        {form.watch("page") === "video_specific" && (
          <div>
            <Label htmlFor="banner-video-id">ID do Vídeo</Label>
            <Input
              id="banner-video-id"
              {...form.register("videoId")}
              placeholder="Cole o ID do vídeo aqui..."
              data-testid="input-banner-video-id"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="banner-start-datetime">Data/Hora Inicial</Label>
            <Input
              id="banner-start-datetime"
              type="datetime-local"
              {...form.register("startDateTime")}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  form.setValue("startDateTime", "");
                }
              }}
              data-testid="input-banner-start-datetime"
            />
          </div>

          <div>
            <Label htmlFor="banner-end-datetime">Data/Hora Final</Label>
            <Input
              id="banner-end-datetime"
              type="datetime-local"
              {...form.register("endDateTime")}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  form.setValue("endDateTime", "");
                }
              }}
              data-testid="input-banner-end-datetime"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("showTitle") ?? true}
              onCheckedChange={(checked) => form.setValue("showTitle", checked)}
              data-testid="switch-banner-show-title"
            />
            <Label>Mostrar Título</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("showDescription") ?? true}
              onCheckedChange={(checked) => form.setValue("showDescription", checked)}
              data-testid="switch-banner-show-description"
            />
            <Label>Mostrar Descrição</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("showButton") ?? true}
              onCheckedChange={(checked) => form.setValue("showButton", checked)}
              data-testid="switch-banner-show-button"
            />
            <Label>Mostrar Botão</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("isActive") ?? false}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
              data-testid="switch-banner-active"
            />
            <Label>Banner Ativo</Label>
          </div>

          {form.watch("page") === "bio" && (
            <div className="flex items-center space-x-2">
              <Switch
                checked={form.watch("opensCouponsModal") ?? false}
                onCheckedChange={(checked) => form.setValue("opensCouponsModal", checked)}
                data-testid="switch-banner-opens-coupons-modal"
              />
              <Label>Abrir Modal de Cupons</Label>
            </div>
          )}
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={mutation.isPending}
          data-testid="button-save-banner"
        >
          {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Banner" : "Criar Banner"}
        </Button>
        </form>
        </Form>
      )}
    </div>
  );
}