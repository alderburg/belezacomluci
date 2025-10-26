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
import { insertProductSchema, type Product } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import { useEffect } from 'react';

export default function AdminProductFormMobilePage() {
  const [match, params] = useRoute("/admin/products-mobile/edit/:id");
  const productId = match && params && params.id ? String(params.id) : undefined;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = Boolean(match && productId);

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ['/api/admin/products', productId],
    queryFn: async () => {
      if (!productId) throw new Error('ID não fornecido');
      console.log('Buscando produto para edição:', productId);
      const res = await fetch(`/api/admin/products/${productId}`);
      if (!res.ok) throw new Error('Erro ao carregar produto');
      const data = await res.json();
      console.log('Produto carregado:', data);
      return data;
    },
    enabled: Boolean(isEditing && productId),
  });

  // Mostrar erro se houver
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar produto:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados do produto",
      });
    }
  }, [error, toast]);

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const form = useForm<z.infer<typeof insertProductSchema>>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "ebook",
      fileUrl: "",
      coverImageUrl: "",
      categoryId: "",
      isExclusive: false,
      isActive: true,
    },
  });

  // Reset form when product data loads or ID changes
  useEffect(() => {
    if (product && isEditing) {
      console.log('Populando formulário com dados do produto:', product);
      form.reset({
        title: product.title,
        description: product.description || "",
        type: product.type,
        fileUrl: product.fileUrl || "",
        coverImageUrl: product.coverImageUrl || "",
        categoryId: product.categoryId || "",
        isExclusive: product.isExclusive ?? false,
        isActive: product.isActive ?? true,
      });
    } else if (!isEditing) {
      console.log('Resetando formulário para novo produto');
      form.reset({
        title: "",
        description: "",
        type: "ebook",
        fileUrl: "",
        coverImageUrl: "",
        categoryId: "",
        isExclusive: false,
        isActive: true,
      });
    }
  }, [product, isEditing, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertProductSchema>) => {
      if (isEditing) {
        return await apiRequest(`/api/admin/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return await apiRequest('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: "Sucesso!",
        description: isEditing ? "Produto atualizado com sucesso" : "Produto criado com sucesso",
      });
      setLocation('/admin/products-mobile');
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || (isEditing ? "Erro ao atualizar produto" : "Erro ao criar produto"),
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/products-mobile');
  };

  const onSubmit = (data: z.infer<typeof insertProductSchema>) => {
    mutation.mutate(data);
  };

  const handleFileUrlChange = async (url: string) => {
    if (!url) return;

    const isYouTubeUrl = /(?:youtube\.com|youtu\.be)/.test(url);
    
    if (isYouTubeUrl) {
      const isPlaylist = /[?&]list=([^&\n?#]+)/.test(url);
      
      if (isPlaylist) {
        form.setValue("type", "course_playlist");
        
        try {
          const playlistIdMatch = url.match(/[?&]list=([^&\n?#]+)/);
          if (playlistIdMatch && playlistIdMatch[1]) {
            const playlistId = playlistIdMatch[1];
            
            const playlistResponse = await fetch(`/api/youtube/playlist/${playlistId}`);
            if (playlistResponse.ok) {
              const playlistData = await playlistResponse.json();
              
              if (playlistData && playlistData.videos && playlistData.videos.length > 0) {
                if (playlistData.playlistTitle) {
                  form.setValue('title', playlistData.playlistTitle);
                }
                if (playlistData.playlistDescription && playlistData.playlistDescription.trim() !== '') {
                  form.setValue('description', playlistData.playlistDescription);
                }
                if (playlistData.playlistThumbnail) {
                  form.setValue('coverImageUrl', playlistData.playlistThumbnail);
                }
                
                toast({
                  title: "Playlist detectada!",
                  description: `${playlistData.videos.length} vídeos encontrados. Tipo alterado para "Curso - Playlist".`,
                });
              }
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados da playlist:', error);
        }
      } else {
        form.setValue("type", "course_video");
        
        try {
          const videoIdMatch = url.match(/(?:v=|youtu\.be\/|embed\/|v\/|watch\?.*&v=)([^&\n?#]+)/);
          if (videoIdMatch && videoIdMatch[1]) {
            let videoId = videoIdMatch[1];
            if (videoId.includes('?')) {
              videoId = videoId.split('?')[0];
            }
            
            const videoResponse = await fetch(`/api/youtube/video/${videoId}`);
            if (videoResponse.ok) {
              const videoData = await videoResponse.json();
              
              if (videoData.title) {
                form.setValue('title', videoData.title);
              }
              if (videoData.description) {
                form.setValue('description', videoData.description);
              }
              if (videoData.thumbnail) {
                form.setValue('coverImageUrl', videoData.thumbnail);
              }
              
              toast({
                title: "Vídeo do YouTube detectado!",
                description: "Tipo alterado para 'Curso - Vídeo Único'. Dados preenchidos automaticamente.",
              });
            }
          }
        } catch (error) {
          console.error('Erro ao buscar dados do vídeo:', error);
        }
      }
    }
  };

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const productType = form.watch("type");
  const isYouTubeProduct = productType === "course_video" || productType === "course_playlist";

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
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
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
          <Label htmlFor="product-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="product-title"
            {...form.register("title")}
            placeholder="Digite o título do produto"
            data-testid="input-product-title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="product-description">Descrição <span className="text-destructive">*</span></Label>
          <Textarea
            id="product-description"
            {...form.register("description")}
            placeholder="Descrição do produto"
            data-testid="textarea-product-description"
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
          )}
        </div>

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-product-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ebook">E-book</SelectItem>
                  <SelectItem value="course_video">Curso - Vídeo Único</SelectItem>
                  <SelectItem value="course_playlist">Curso - Playlist</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="checklist">Checklist</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <Label htmlFor="product-file">
            {isYouTubeProduct ? "URL do YouTube" : "URL do Arquivo"} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="product-file"
            {...form.register("fileUrl")}
            placeholder={isYouTubeProduct
              ? "https://www.youtube.com/watch?v=... ou https://www.youtube.com/playlist?list=..." 
              : "https://..."}
            data-testid="input-product-file"
            onChange={(e) => {
              form.setValue("fileUrl", e.target.value);
              handleFileUrlChange(e.target.value);
            }}
          />
          {form.formState.errors.fileUrl && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.fileUrl.message}</p>
          )}
        </div>

        <div>
          <ImageUpload
            id="product-cover"
            label="Imagem de Capa"
            value={form.watch("coverImageUrl")}
            onChange={(base64) => form.setValue("coverImageUrl", base64)}
            placeholder="Selecionar imagem de capa"
            required
          />
          {form.formState.errors.coverImageUrl && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.coverImageUrl.message}</p>
          )}
        </div>

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-product-category">
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

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("isExclusive") || false}
              onCheckedChange={(checked) => form.setValue("isExclusive", checked)}
              data-testid="switch-product-exclusive"
            />
            <Label>Conteúdo Exclusivo</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={form.watch("isActive") || false}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
              data-testid="switch-product-active"
            />
            <Label>Produto Ativo</Label>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={mutation.isPending}
          data-testid="button-save-product"
        >
          {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Produto" : "Criar Produto"}
        </Button>
        </form>
        </Form>
      )}
    </div>
  );
}
