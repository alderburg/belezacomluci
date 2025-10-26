import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Redirect, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPopupSchema, type Popup } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import type { z } from 'zod';

export default function AdminPopupFormMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = useParams() as { id?: string };
  const popupId = params.id;
  const isEditing = !!popupId;

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: popup, isLoading } = useQuery<Popup>({
    queryKey: ["/api/admin/popups", popupId],
    enabled: isEditing,
  });

  const form = useForm<z.infer<typeof insertPopupSchema>>({
    resolver: zodResolver(insertPopupSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      trigger: "login",
      targetPage: "",
      targetVideoId: "",
      targetCourseId: "",
      showFrequency: "always",
      showTitle: true,
      showDescription: true,
      showButton: true,
      isExclusive: false,
      isActive: false,
      startDateTime: "",
      endDateTime: "",
    },
    values: popup && isEditing ? {
      title: popup.title,
      description: popup.description,
      imageUrl: popup.imageUrl,
      linkUrl: popup.linkUrl || "",
      trigger: popup.trigger,
      targetPage: popup.targetPage || "",
      targetVideoId: popup.targetVideoId || "",
      targetCourseId: popup.targetCourseId || "",
      showFrequency: popup.showFrequency,
      showTitle: popup.showTitle ?? true,
      showDescription: popup.showDescription ?? true,
      showButton: popup.showButton ?? true,
      isExclusive: popup.isExclusive || false,
      isActive: popup.isActive,
      startDateTime: popup.startDateTime ? 
        new Date(popup.startDateTime).toISOString().slice(0, 16) : "",
      endDateTime: popup.endDateTime ? 
        new Date(popup.endDateTime).toISOString().slice(0, 16) : "",
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertPopupSchema>) => {
      if (isEditing) {
        return await apiRequest(`/api/admin/popups/${popupId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return await apiRequest('/api/admin/popups', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/popups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/popups"] });
      toast({
        title: "Sucesso",
        description: isEditing ? "Popup atualizado!" : "Popup criado!",
      });
      setLocation('/admin/popups-mobile');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar popup",
        variant: "destructive",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/popups-mobile');
  };

  const onSubmit = (data: z.infer<typeof insertPopupSchema>) => {
    mutation.mutate(data);
  };

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
            {isEditing ? 'Editar Pop-up' : 'Novo Pop-up'}
          </h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="pt-20 px-4 space-y-4">
        <div>
          <Label htmlFor="popup-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="popup-title"
            {...form.register("title")}
            placeholder="Digite o título do popup"
            data-testid="input-popup-title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="popup-description">Descrição <span className="text-destructive">*</span></Label>
          <Textarea
            id="popup-description"
            {...form.register("description")}
            placeholder="Descrição do popup"
            data-testid="textarea-popup-description"
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div>
          <ImageUpload
            id="popup-image"
            label="Imagem do Popup"
            value={form.watch("imageUrl")}
            onChange={(base64) => form.setValue("imageUrl", base64)}
            placeholder="Selecionar imagem do popup"
            required
          />
          {form.formState.errors.imageUrl && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.imageUrl.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="popup-link">URL de Destino</Label>
          <Input
            id="popup-link"
            {...form.register("linkUrl")}
            placeholder="https://..."
            data-testid="input-popup-link"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="popup-trigger">Gatilho de Exibição</Label>
            <Select
              value={form.watch("trigger") || ""}
              onValueChange={(value) => {
                form.setValue("trigger", value);
                if (value === "scheduled") {
                  form.setValue("showFrequency", "once_per_session");
                }
              }}
            >
              <SelectTrigger data-testid="select-popup-trigger">
                <SelectValue placeholder="Selecione o gatilho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="login">Ao fazer login</SelectItem>
                <SelectItem value="logout">Ao sair do sistema</SelectItem>
                <SelectItem value="page_specific">Página específica</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="popup-frequency">Frequência</Label>
            {form.watch("trigger") === "scheduled" ? (
              <Input
                value="Uma vez por sessão"
                disabled
                className="bg-gray-100 text-gray-600"
                data-testid="input-popup-frequency-scheduled"
              />
            ) : (
              <Select
                value={form.watch("showFrequency") || ""}
                onValueChange={(value) => form.setValue("showFrequency", value)}
              >
                <SelectTrigger data-testid="select-popup-frequency">
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="always">Sempre mostrar</SelectItem>
                  <SelectItem value="once_per_session">Uma vez por sessão</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {form.watch("trigger") === "page_specific" && (
          <>
            <div>
              <Label htmlFor="popup-target-page">Página de Destino</Label>
              <Select
                value={form.watch("targetPage") || ""}
                onValueChange={(value) => form.setValue("targetPage", value)}
              >
                <SelectTrigger data-testid="select-popup-target-page">
                  <SelectValue placeholder="Selecione a página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Página Inicial</SelectItem>
                  <SelectItem value="videos">Vídeos Exclusivos</SelectItem>
                  <SelectItem value="products">Produtos Digitais</SelectItem>
                  <SelectItem value="coupons">Cupons</SelectItem>
                  <SelectItem value="community">Comunidade</SelectItem>
                  <SelectItem value="profile">Perfil</SelectItem>
                  <SelectItem value="video_specific">Vídeo Específico</SelectItem>
                  <SelectItem value="course_specific">Curso Específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.watch("targetPage") === "video_specific" && (
              <div>
                <Label htmlFor="popup-video-id">ID do Vídeo</Label>
                <Input
                  id="popup-video-id"
                  {...form.register("targetVideoId")}
                  placeholder="Cole o ID do vídeo aqui..."
                  data-testid="input-popup-video-id"
                />
              </div>
            )}

            {form.watch("targetPage") === "course_specific" && (
              <div>
                <Label htmlFor="popup-course-id">ID do Curso</Label>
                <Input
                  id="popup-course-id"
                  {...form.register("targetCourseId")}
                  placeholder="Cole o ID do curso aqui..."
                  data-testid="input-popup-course-id"
                />
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="popup-start-datetime">Data/Hora Inicial</Label>
            <Input
              id="popup-start-datetime"
              type="datetime-local"
              {...form.register("startDateTime")}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  form.setValue("startDateTime", "");
                }
              }}
              data-testid="input-popup-start-datetime"
            />
          </div>

          <div>
            <Label htmlFor="popup-end-datetime">Data/Hora Final</Label>
            <Input
              id="popup-end-datetime"
              type="datetime-local"
              {...form.register("endDateTime")}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  form.setValue("endDateTime", "");
                }
              }}
              data-testid="input-popup-end-datetime"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("showTitle") ?? true}
              onCheckedChange={(checked) => form.setValue("showTitle", checked)}
              data-testid="switch-popup-show-title"
            />
            <Label>Mostrar Título</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("showDescription") ?? true}
              onCheckedChange={(checked) => form.setValue("showDescription", checked)}
              data-testid="switch-popup-show-description"
            />
            <Label>Mostrar Descrição</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("showButton") ?? true}
              onCheckedChange={(checked) => form.setValue("showButton", checked)}
              data-testid="switch-popup-show-button"
            />
            <Label>Mostrar Botão</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("isExclusive") || false}
              onCheckedChange={(checked) => form.setValue("isExclusive", checked)}
              data-testid="switch-popup-exclusive"
            />
            <Label>Exclusivo para Premium</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("isActive") || false}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
              data-testid="switch-popup-active"
            />
            <Label>Popup Ativo</Label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={mutation.isPending}
          data-testid="button-save-popup"
        >
          {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Pop-up" : "Criar Pop-up"}
        </Button>
      </form>
    </div>
  );
}
