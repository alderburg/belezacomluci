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
import { insertBannerSchema, type Banner } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import { ResourceSearchSelect } from '@/components/resource-search-select';
import type { z } from 'zod';
import { useEffect, useState } from 'react';

export default function AdminBannerFormMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/admin/banners-mobile/edit/:id");
  const bannerId = match && params && params.id ? String(params.id) : undefined;
  const isEditing = Boolean(match && bannerId);

  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingData, setPendingData] = useState<z.infer<typeof insertBannerSchema> | null>(null);
  const [conflictingBanner, setConflictingBanner] = useState<Banner | null>(null);
  const [originalOrder, setOriginalOrder] = useState<number | null>(null);
  const [originalPage, setOriginalPage] = useState<string | null>(null);
  const [originalVideoId, setOriginalVideoId] = useState<string | null>(null);
  const [originalCourseId, setOriginalCourseId] = useState<string | null>(null);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: banner, isLoading } = useQuery<Banner>({
    queryKey: [`/api/admin/banners/${bannerId}`],
    enabled: Boolean(isEditing && bannerId),
  });

  const { data: banners } = useQuery<Banner[]>({
    queryKey: ["/api/admin/banners"],
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
      showTitle: false,
      showDescription: false,
      showButton: false,
      isActive: true,
      opensCouponsModal: false,
      displayOn: "both",
      startDateTime: "",
      endDateTime: "",
      videoId: null,
      courseId: null,
    },
  });

  useEffect(() => {
    if (banner && isEditing) {
      const orderValue = banner.order || 0;
      setOriginalOrder(orderValue);
      setOriginalPage(banner.page);
      setOriginalVideoId(banner.videoId || null);
      setOriginalCourseId(banner.courseId || null);
      form.reset({
        title: banner.title,
        description: banner.description,
        imageUrl: banner.imageUrl,
        linkUrl: banner.linkUrl || "",
        page: banner.page,
        order: orderValue,
        showTitle: banner.showTitle ?? true,
        showDescription: banner.showDescription ?? true,
        showButton: banner.showButton ?? true,
        isActive: banner.isActive,
        opensCouponsModal: banner.opensCouponsModal ?? false,
        displayOn: banner.displayOn || "both",
        startDateTime: banner.startDateTime ?
          new Date(banner.startDateTime).toISOString().slice(0, 16) : "",
        endDateTime: banner.endDateTime ?
          new Date(banner.endDateTime).toISOString().slice(0, 16) : "",
        videoId: banner.videoId || "",
        courseId: banner.courseId || "",
      });
    }
  }, [banner, isEditing, form]);

  useEffect(() => {
    if (!isEditing && banners) {
      const currentPage = form.watch("page") || "home";
      const currentVideoId = form.watch("videoId") || "";
      const currentCourseId = form.watch("courseId") || "";

      const filteredBanners = banners.filter(b => {
        if (b.page !== currentPage) return false;
        if (currentPage === 'video_specific' && b.videoId !== currentVideoId) return false;
        if (currentPage === 'course_specific' && b.courseId !== currentCourseId) return false;
        return true;
      });

      const maxOrder = filteredBanners.length > 0 
        ? filteredBanners.reduce((max, b) => Math.max(max, b.order || 0), 0) + 1
        : 0;
      form.setValue("order", maxOrder);
    }

    const subscription = form.watch((value, { name }) => {
      if ((name === "page" || name === "videoId" || name === "courseId") && !isEditing && banners) {
        const currentPage = value.page || "home";
        const currentVideoId = value.videoId || "";
        const currentCourseId = value.courseId || "";

        const filteredBanners = banners.filter(b => {
          if (b.page !== currentPage) return false;
          if (currentPage === 'video_specific' && b.videoId !== currentVideoId) return false;
          if (currentPage === 'course_specific' && b.courseId !== currentCourseId) return false;
          return true;
        });

        const maxOrder = filteredBanners.length > 0 
          ? filteredBanners.reduce((max, b) => Math.max(max, b.order || 0), 0) + 1
          : 0;
        form.setValue("order", maxOrder);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, isEditing, banners]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertBannerSchema>) => {
      // Garantir que campos vazios sejam null e limpar campos conforme a página
      const cleanedData = {
        ...data,
        videoId: data.page === 'video_specific' && data.videoId ? data.videoId : null,
        courseId: data.page === 'course_specific' && data.courseId ? data.courseId : null,
        startDateTime: data.startDateTime || null,
        endDateTime: data.endDateTime || null,
      };

      console.log('[Banner Form Mobile] Página:', data.page);
      console.log('[Banner Form Mobile] Enviando dados:', cleanedData);

      if (isEditing) {
        return await apiRequest('PUT', `/api/banners/${bannerId}`, cleanedData);
      } else {
        return await apiRequest('POST', '/api/banners', cleanedData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      if (isEditing && bannerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/banners/${bannerId}`] });
      }
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

  const reorganizeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertBannerSchema>) => {
      if (!banners) return;

      // Garantir que campos vazios sejam null
      const cleanedData = {
        ...data,
        videoId: data.videoId || null,
        courseId: data.courseId || null,
        startDateTime: data.startDateTime || null,
        endDateTime: data.endDateTime || null,
      };

      const newOrder = cleanedData.order || 0;
      const oldOrder = originalOrder ?? -1;

      const updates: Promise<any>[] = [];

      if (isEditing) {
        if (newOrder < oldOrder) {
          // Movendo para cima: empurrar para baixo os banners entre newOrder e oldOrder
          banners.forEach(b => {
            if (b.id !== bannerId && b.page === data.page) {
              if (data.page === 'video_specific' && b.videoId !== data.videoId) return;
              if (data.page === 'course_specific' && b.courseId !== data.courseId) return;
              if (b.order !== null && b.order !== undefined) {
                if (b.order >= newOrder && b.order < oldOrder) {
                  updates.push(
                    apiRequest('PUT', `/api/banners/${b.id}`, {
                      ...b,
                      order: b.order + 1,
                    })
                  );
                }
              }
            }
          });
        } else if (newOrder > oldOrder) {
          // Movendo para baixo: empurrar para cima os banners entre oldOrder e newOrder
          banners.forEach(b => {
            if (b.id !== bannerId && b.page === data.page) {
              if (data.page === 'video_specific' && b.videoId !== data.videoId) return;
              if (data.page === 'course_specific' && b.courseId !== data.courseId) return;
              if (b.order !== null && b.order !== undefined) {
                if (b.order > oldOrder && b.order <= newOrder) {
                  updates.push(
                    apiRequest('PUT', `/api/banners/${b.id}`, {
                      ...b,
                      order: b.order - 1,
                    })
                  );
                }
              }
            }
          });
        }
      } else {
        // Modo criação: empurrar para baixo todos os banners >= newOrder
        banners.forEach(b => {
          if (b.page === data.page) {
            if (data.page === 'video_specific' && b.videoId !== data.videoId) return;
            if (data.page === 'course_specific' && b.courseId !== data.courseId) return;
            if (b.order !== null && b.order !== undefined && b.order >= newOrder) {
              updates.push(
                apiRequest('PUT', `/api/banners/${b.id}`, {
                  ...b,
                  order: b.order + 1,
                })
              );
            }
          }
        });
      }

      await Promise.all(updates);

      if (isEditing) {
        return await apiRequest('PUT', `/api/banners/${bannerId}`, data);
      } else {
        return await apiRequest('POST', '/api/banners', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/banners"] });
      if (isEditing && bannerId) {
        queryClient.invalidateQueries({ queryKey: [`/api/admin/banners/${bannerId}`] });
      }
      toast({
        title: "Sucesso",
        description: isEditing ? "Banner atualizado e banners reorganizados!" : "Banner criado e banners reorganizados!",
      });
      setShowConflictDialog(false);
      setPendingData(null);
      setConflictingBanner(null);
      setLocation('/admin/banners-mobile');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao reorganizar banners",
        variant: "destructive",
      });
      setShowConflictDialog(false);
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/banners-mobile');
  };

  const onSubmit = (data: z.infer<typeof insertBannerSchema>) => {
    // VALIDAÇÃO CRÍTICA: Verificar se vídeo ou curso foi selecionado quando necessário
    if (data.page === 'video_specific') {
      if (!data.videoId || data.videoId.trim() === '') {
        form.setError('videoId', { 
          type: 'manual', 
          message: 'Por favor, selecione um vídeo' 
        });
        toast({
          title: "Erro de validação",
          description: "Por favor, selecione um vídeo antes de salvar.",
          variant: "destructive",
        });
        return;
      }
    }

    if (data.page === 'course_specific') {
      if (!data.courseId || data.courseId.trim() === '') {
        form.setError('courseId', { 
          type: 'manual', 
          message: 'Por favor, selecione um curso' 
        });
        toast({
          title: "Erro de validação",
          description: "Por favor, selecione um curso antes de salvar.",
          variant: "destructive",
        });
        return;
      }
    }

    if (isEditing && 
        data.order === originalOrder && 
        data.page === originalPage &&
        (data.page !== 'video_specific' || data.videoId === originalVideoId) &&
        (data.page !== 'course_specific' || data.courseId === originalCourseId)) {
      mutation.mutate(data);
      return;
    }

    const conflicting = banners?.find(b => {
      if (b.id === bannerId) return false;
      if (b.page !== data.page) return false;
      if (data.page === 'video_specific' && b.videoId !== data.videoId) return false;
      if (data.page === 'course_specific' && b.courseId !== data.courseId) return false;
      if (b.order !== data.order) return false;
      return true;
    });

    if (conflicting) {
      setPendingData(data);
      setConflictingBanner(conflicting);
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
    setConflictingBanner(null);
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

        <div>
          <Label htmlFor="banner-display-on">Exibir em</Label>
          <select
            id="banner-display-on"
            {...form.register("displayOn")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="select-banner-display-on"
          >
            <option value="both">🖥️📱 Desktop e Mobile</option>
            <option value="desktop">🖥️ Apenas Desktop</option>
            <option value="mobile">📱 Apenas Mobile</option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Escolha em quais dispositivos este banner será exibido
          </p>
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
              <option value="video_specific">Vídeo Específico</option>
              <option value="course_specific">Curso Específico</option>
            </select>
          </div>
        </div>

        {form.watch("page") === "video_specific" && (
          <ResourceSearchSelect
            type="video"
            value={form.watch("videoId")}
            onChange={(id) => form.setValue("videoId", id)}
            label="Vídeo"
            placeholder="Busque e selecione um vídeo"
            required
            error={form.formState.errors.videoId?.message}
          />
        )}

        {form.watch("page") === "course_specific" && (
          <ResourceSearchSelect
            type="course"
            value={form.watch("courseId")}
            onChange={(id) => form.setValue("courseId", id)}
            label="Curso"
            placeholder="Busque e selecione um curso"
            required
            error={form.formState.errors.courseId?.message}
          />
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
          disabled={mutation.isPending || reorganizeMutation.isPending}
          data-testid="button-save-banner"
        >
          {reorganizeMutation.isPending ? "Reorganizando..." : mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Banner" : "Criar Banner"}
        </Button>
        </form>
        </Form>
      )}

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="mx-auto w-[calc(100vw-32px)] sm:max-w-sm rounded-2xl border-0 shadow-xl p-4">
          <AlertDialogHeader className="text-center space-y-2">
            <AlertDialogTitle>Conflito de Posição</AlertDialogTitle>
            <AlertDialogDescription>
              A posição {pendingData?.order} já está ocupada pelo banner "{conflictingBanner?.title}" 
              {pendingData?.page === 'video_specific' && pendingData?.videoId 
                ? ` no vídeo selecionado` 
                : pendingData?.page === 'course_specific' && pendingData?.courseId
                ? ` no curso selecionado`
                : ' na página selecionada'}.
              Deseja reorganizar automaticamente os banners?
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