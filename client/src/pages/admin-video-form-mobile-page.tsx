import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { insertVideoSchema, type Video } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/image-upload';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';

export default function AdminVideoFormMobilePage() {
  const { id: videoId } = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(videoId);

  const { data: video, isLoading } = useQuery<Video>({
    queryKey: ["/api/admin/videos", videoId],
    enabled: isEditing,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const form = useForm<z.infer<typeof insertVideoSchema>>({
    resolver: zodResolver(insertVideoSchema),
    defaultValues: {
      title: "",
      description: "",
      videoUrl: "",
      thumbnailUrl: "",
      type: "video",
      categoryId: "",
      duration: "",
      isExclusive: false,
    },
  });

  // Reset form when video data loads
  if (video && !form.formState.isDirty) {
    form.reset({
      title: video.title,
      description: video.description || "",
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || "",
      type: video.type,
      categoryId: video.categoryId || "",
      duration: video.duration || "",
      isExclusive: video.isExclusive ?? false,
    });
  }

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertVideoSchema>) => {
      if (isEditing) {
        return await apiRequest(`/api/admin/videos/${videoId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return await apiRequest('/api/admin/videos', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videos'] });
      toast({
        title: "Sucesso!",
        description: isEditing ? "Vídeo atualizado com sucesso" : "Vídeo criado com sucesso",
      });
      setLocation('/admin/videos-mobile');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || (isEditing ? "Erro ao atualizar vídeo" : "Erro ao criar vídeo"),
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/videos-mobile');
  };

  const onSubmit = (data: z.infer<typeof insertVideoSchema>) => {
    mutation.mutate(data);
  };

  // Função para extrair ID do vídeo do YouTube
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^&\n?#]+)/,
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Função para detectar se é playlist
  const isPlaylistUrl = (url: string): boolean => {
    return url.includes('list=');
  };

  // Função para lidar com mudança de URL do vídeo
  const handleVideoUrlChange = async (url: string) => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      return;
    }

    try {
      const isPlaylist = isPlaylistUrl(url);
      
      if (isPlaylist) {
        const playlistIdMatch = url.match(/[?&]list=([^&\n?#]+)/);
        if (playlistIdMatch && playlistIdMatch[1]) {
          const playlistId = playlistIdMatch[1];
          
          try {
            const response = await fetch(`/api/youtube/playlist-duration/${playlistId}`);
            if (response.ok) {
              const data = await response.json();
              form.setValue('duration', data.totalDuration);
              form.setValue('type', 'playlist');
            }
          } catch (error) {
            console.error('Erro ao buscar duração da playlist:', error);
          }
        }
      } else {
        const response = await fetch(`/api/youtube/video-info/${videoId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.duration) {
            form.setValue('duration', data.duration);
          }
          if (data.thumbnailUrl && !form.watch('thumbnailUrl')) {
            form.setValue('thumbnailUrl', data.thumbnailUrl);
          }
          form.setValue('type', 'video');
        }
      }
    } catch (error) {
      console.error('Erro ao buscar dados do vídeo:', error);
    }
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
            {isEditing ? 'Editar Vídeo' : 'Novo Vídeo'}
          </h1>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="pt-20 px-4 space-y-4">
        <div>
          <Label htmlFor="video-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="video-title"
            {...form.register("title")}
            placeholder="Digite o título do vídeo"
            data-testid="input-video-title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="video-description">Descrição <span className="text-destructive">*</span></Label>
          <Textarea
            id="video-description"
            {...form.register("description")}
            placeholder="Descrição do vídeo"
            data-testid="textarea-video-description"
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="video-url">URL do Vídeo <span className="text-destructive">*</span></Label>
          <Input
            id="video-url"
            {...form.register("videoUrl")}
            placeholder="https://..."
            data-testid="input-video-url"
            onChange={(e) => {
              form.setValue("videoUrl", e.target.value);
              if (e.target.value) {
                handleVideoUrlChange(e.target.value);
              }
            }}
          />
          {form.formState.errors.videoUrl && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.videoUrl.message}</p>
          )}
        </div>

        <div>
          <ImageUpload
            id="video-thumbnail"
            label="Imagem de Capa"
            value={form.watch("thumbnailUrl")}
            onChange={(base64) => form.setValue("thumbnailUrl", base64)}
            placeholder="Selecionar imagem de capa"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="video-type">Tipo <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch("type") || "video"}
              onValueChange={(value) => form.setValue("type", value)}
            >
              <SelectTrigger data-testid="select-video-type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="playlist">Playlist</SelectItem>
                <SelectItem value="live">Live</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="video-category">Categoria <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch("categoryId") || ""}
              onValueChange={(value) => form.setValue("categoryId", value)}
            >
              <SelectTrigger data-testid="select-video-category">
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
          <Label htmlFor="video-duration">Duração</Label>
          <Input
            id="video-duration"
            type="text"
            placeholder="Será preenchido automaticamente (HH:MM:SS)"
            value={form.watch("duration") || ""}
            readOnly
            className="bg-muted cursor-not-allowed"
            data-testid="input-video-duration"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={form.watch("isExclusive") || false}
            onCheckedChange={(checked) => form.setValue("isExclusive", checked)}
            data-testid="switch-video-exclusive"
          />
          <Label>Conteúdo Exclusivo</Label>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={mutation.isPending}
          data-testid="button-save-video"
        >
          {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Vídeo" : "Criar Vídeo"}
        </Button>
      </form>
    </div>
  );
}
