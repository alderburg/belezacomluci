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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Redirect, useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVideoSchema, type Video } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import { useEffect } from 'react';

export default function AdminVideoFormMobilePage() {
  const [match, params] = useRoute("/admin/videos-mobile/edit/:id");
  const videoId = match && params && params.id ? String(params.id) : undefined;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(match && videoId);

  const { data: video, isLoading } = useQuery<Video>({
    queryKey: ['/api/admin/videos', videoId],
    queryFn: async () => {
      if (!videoId) throw new Error('ID não fornecido');
      const res = await fetch(`/api/admin/videos/${videoId}`);
      if (!res.ok) throw new Error('Erro ao carregar vídeo');
      return res.json();
    },
    enabled: Boolean(isEditing && videoId),
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

  // Reset form when video data loads or ID changes
  useEffect(() => {
    if (video && isEditing) {
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
    } else if (!isEditing) {
      form.reset({
        title: "",
        description: "",
        videoUrl: "",
        thumbnailUrl: "",
        type: "video",
        categoryId: "",
        duration: "",
        isExclusive: false,
      });
    }
  }, [videoId, isEditing]);

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
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#\?]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Remove qualquer caractere especial ou query params
        let videoId = match[1];
        if (videoId.includes('?')) {
          videoId = videoId.split('?')[0];
        }
        if (videoId.includes('&')) {
          videoId = videoId.split('&')[0];
        }
        return videoId.trim();
      }
    }
    return null;
  };

  // Função para detectar se é playlist
  const isPlaylistUrl = (url: string): boolean => {
    const playlistPatterns = [
      /[?&]list=([^&\n?#]+)/,
      /\/playlist\?list=([^&\n?#]+)/
    ];
    return playlistPatterns.some(pattern => pattern.test(url));
  };

  // Função para garantir formato HH:MM:SS
  const ensureHHMMSSFormat = (duration: string): string => {
    // Se já está em HH:MM:SS, retorna
    if (/^\d{2}:\d{2}:\d{2}$/.test(duration)) {
      return duration;
    }

    // Se está em MM:SS, adiciona 00:
    if (/^\d{1,2}:\d{2}$/.test(duration)) {
      const parts = duration.split(':');
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);

      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        return `00:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }

    // Se está em segundos, converte
    const totalSeconds = parseInt(duration);
    if (!isNaN(totalSeconds)) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return duration;
  };

  // Função para lidar com mudança de URL do vídeo
  const handleVideoUrlChange = async (url: string) => {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      console.log('Não foi possível extrair o ID do vídeo da URL:', url);
      return;
    }

    try {
      console.log('Buscando dados do YouTube para vídeo:', videoId);
      
      // Detectar o tipo baseado na URL
      const isPlaylist = isPlaylistUrl(url);
      
      // Se for playlist, calcular duração total
      if (isPlaylist) {
        const playlistIdMatch = url.match(/[?&]list=([^&\n?#]+)/);
        if (playlistIdMatch && playlistIdMatch[1]) {
          const playlistId = playlistIdMatch[1];
          console.log('Detectada playlist, buscando vídeos para calcular duração total:', playlistId);
          
          try {
            const playlistResponse = await fetch(`/api/youtube/playlist/${playlistId}`);
            
            if (!playlistResponse.ok) {
              console.error('Erro ao buscar playlist:', playlistResponse.status);
              toast({
                title: "Aviso",
                description: "Não foi possível carregar dados da playlist. Buscar dados do vídeo individual?",
                variant: "destructive",
              });
            } else {
              const playlistData = await playlistResponse.json();
              
              if (playlistData && playlistData.videos && playlistData.videos.length > 0) {
                // Calcular duração total
                let totalSeconds = 0;
                for (const video of playlistData.videos) {
                  if (video.duration) {
                    const parts = video.duration.split(':');
                    if (parts.length === 3) {
                      const hours = parseInt(parts[0]) || 0;
                      const minutes = parseInt(parts[1]) || 0;
                      const seconds = parseInt(parts[2]) || 0;
                      totalSeconds += hours * 3600 + minutes * 60 + seconds;
                    }
                  }
                }
                
                // Converter total de segundos para HH:MM:SS
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                const totalDuration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                form.setValue('duration', totalDuration);
                console.log(`Duração total da playlist calculada: ${totalDuration} (${playlistData.videos.length} vídeos)`);
                
                // Usar título da playlist
                if (playlistData.playlistTitle) {
                  form.setValue('title', playlistData.playlistTitle);
                  console.log('Título da playlist preenchido:', playlistData.playlistTitle);
                }
                
                // Usar descrição da playlist (somente se existir)
                if (playlistData.playlistDescription && playlistData.playlistDescription.trim() !== '') {
                  form.setValue('description', playlistData.playlistDescription);
                  console.log('Descrição da playlist preenchida');
                } else {
                  console.log('Playlist não possui descrição');
                }
                
                // Usar thumbnail da playlist
                if (playlistData.playlistThumbnail) {
                  form.setValue('thumbnailUrl', playlistData.playlistThumbnail);
                  console.log('Thumbnail da playlist preenchida');
                }
                
                form.setValue('type', 'playlist');
                console.log('Tipo alterado para: playlist');
                
                toast({
                  title: "Playlist detectada!",
                  description: `${playlistData.videos.length} vídeos encontrados. Duração total: ${totalDuration}`,
                });
                
                return; // Não precisa buscar dados do vídeo individual
              }
            }
          } catch (error) {
            console.error('Erro ao buscar dados da playlist:', error);
          }
        }
      }
      
      // Se não for playlist ou falhou, buscar dados do vídeo individual
      const response = await fetch(`/api/youtube/video/${videoId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro ao buscar dados do YouTube:', response.status, errorText);
        toast({
          title: "Aviso",
          description: "Não foi possível carregar os dados do YouTube",
          variant: "destructive",
        });
        return;
      }

      const videoData = await response.json();
      console.log('Dados recebidos do YouTube:', videoData);
      
      // Auto-fill title
      if (videoData.title) {
        form.setValue('title', videoData.title);
        console.log('Título preenchido:', videoData.title);
      }
      
      // Auto-fill type based on detection
      let detectedType = 'video'; // default
      let typeMessage = 'vídeo único';
      
      if (videoData.isLive) {
        detectedType = 'live';
        typeMessage = 'live';
        console.log('Tipo detectado: live');
      } else {
        console.log('Tipo detectado: vídeo único');
      }
      
      form.setValue('type', detectedType);
      console.log('Tipo alterado para:', detectedType);
      
      // Auto-fill duration field - only for non-live videos
      if (videoData.duration && !videoData.isLive) {
        const formattedDuration = ensureHHMMSSFormat(videoData.duration);
        form.setValue('duration', formattedDuration);
        console.log('Duração preenchida:', formattedDuration);
      }
      
      // Auto-fill description
      if (videoData.description) {
        form.setValue('description', videoData.description);
        console.log('Descrição preenchida automaticamente');
      }
      
      // Auto-fill thumbnail
      if (videoData.thumbnail) {
        form.setValue('thumbnailUrl', videoData.thumbnail);
        console.log('Thumbnail preenchida automaticamente');
      }
      
      // Show toast message
      toast({
        title: `${typeMessage.charAt(0).toUpperCase() + typeMessage.slice(1)} detectada!`,
        description: "Título, tipo, descrição e thumbnail preenchidos automaticamente.",
      });
    } catch (error) {
      console.error('Erro ao buscar dados do vídeo:', error);
      toast({
        title: "Erro",
        description: "Falha ao buscar dados do YouTube",
        variant: "destructive",
      });
    }
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
            {isEditing ? 'Editar Vídeo' : 'Novo Vídeo'}
          </h1>
        </div>
      </div>

      {isEditing && isLoading ? (
        <div className="pt-20 px-4 flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
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
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-video-type">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="video">Vídeo</SelectItem>
                    <SelectItem value="playlist">Playlist</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-video-category">
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
      )}
    </div>
  );
}
