import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { insertNotificationSchema, type Notification } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { ImageUpload } from '@/components/ui/image-upload';
import type { z } from 'zod';
import { useEffect } from 'react';

export default function AdminNotificationFormMobilePage() {
  console.log('🎬 [NOTIFICAÇÃO FORM] Componente montado/renderizado');
  
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/admin/notifications-mobile/edit/:id");
  const notificationId = match && params && params.id ? String(params.id) : undefined;
  const isEditing = Boolean(match && notificationId);

  console.log('🔍 [NOTIFICAÇÃO FORM] Detecção de rota:', {
    match,
    params,
    notificationId,
    isEditing
  });

  if (!user?.isAdmin) {
    console.log('⚠️ [NOTIFICAÇÃO FORM] Usuário não é admin, redirecionando');
    return <Redirect to="/" />;
  }

  const { data: notification, isLoading, error } = useQuery<Notification>({
    queryKey: ['/api/admin/notifications', notificationId],
    queryFn: async () => {
      console.log('🔍 [NOTIFICAÇÃO] Iniciando queryFn');
      console.log('🔍 [NOTIFICAÇÃO] notificationId:', notificationId);
      
      if (!notificationId) {
        console.error('❌ [NOTIFICAÇÃO] ID não fornecido!');
        throw new Error('ID não fornecido');
      }
      
      const url = `/api/admin/notifications/${notificationId}`;
      console.log('🔍 [NOTIFICAÇÃO] Fazendo fetch para:', url);
      
      try {
        const res = await fetch(url, {
          credentials: 'include',
        });
        
        console.log('📡 [NOTIFICAÇÃO] Response status:', res.status);
        console.log('📡 [NOTIFICAÇÃO] Response ok:', res.ok);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ [NOTIFICAÇÃO] Erro na resposta:', errorText);
          throw new Error(`Erro ao carregar notificação: ${res.status} - ${errorText}`);
        }
        
        const data = await res.json();
        console.log('✅ [NOTIFICAÇÃO] Notificação carregada com sucesso:', data);
        return data;
      } catch (err) {
        console.error('❌ [NOTIFICAÇÃO] Erro no fetch:', err);
        throw err;
      }
    },
    enabled: Boolean(isEditing && notificationId),
  });

  console.log('📊 [NOTIFICAÇÃO] Estado da query:', {
    notification,
    isLoading,
    error,
    enabled: Boolean(isEditing && notificationId)
  });

  const form = useForm<z.infer<typeof insertNotificationSchema>>({
    resolver: zodResolver(insertNotificationSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      targetAudience: "all",
      isActive: true,
      startDateTime: "",
      endDateTime: "",
    },
  });

  useEffect(() => {
    console.log('🔄 [NOTIFICAÇÃO] useEffect disparado');
    console.log('🔍 [NOTIFICAÇÃO] Valores atuais:', {
      notification,
      isEditing,
      notificationId,
      isLoading,
      error
    });

    if (notification && isEditing) {
      console.log('📝 [NOTIFICAÇÃO] Populando formulário com dados:', notification);
      
      try {
        form.reset({
          title: notification.title,
          description: notification.description || "",
          imageUrl: notification.imageUrl || "",
          linkUrl: notification.linkUrl || "",
          targetAudience: notification.targetAudience,
          isActive: notification.isActive ?? true,
          startDateTime: notification.startDateTime ? 
            new Date(notification.startDateTime).toISOString().slice(0, 16) : "",
          endDateTime: notification.endDateTime ? 
            new Date(notification.endDateTime).toISOString().slice(0, 16) : "",
        });
        console.log('✅ [NOTIFICAÇÃO] Formulário populado com sucesso');
      } catch (err) {
        console.error('❌ [NOTIFICAÇÃO] Erro ao popular formulário:', err);
      }
    } else if (isEditing && !notification) {
      console.log('⚠️ [NOTIFICAÇÃO] isEditing=true mas notification está vazio');
      console.log('🔍 [NOTIFICAÇÃO] notificationId:', notificationId);
      console.log('🔍 [NOTIFICAÇÃO] isLoading:', isLoading);
      console.log('🔍 [NOTIFICAÇÃO] error:', error);
    } else if (!isEditing) {
      console.log('ℹ️ [NOTIFICAÇÃO] Modo de criação (não edição)');
    }
  }, [notification, isEditing, notificationId, isLoading, error, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertNotificationSchema>) => {
      if (isEditing) {
        return await apiRequest('PUT', `/api/admin/notifications/${notificationId}`, data);
      } else {
        return await apiRequest('POST', '/api/admin/notifications', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({
        title: "Sucesso",
        description: isEditing ? "Notificação atualizada!" : "Notificação criada!",
      });
      setLocation('/admin/notifications-mobile');
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar notificação",
        variant: "destructive",
      });
    },
  });

  const handleBackClick = () => {
    setLocation('/admin/notifications-mobile');
  };

  const onSubmit = (data: z.infer<typeof insertNotificationSchema>) => {
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
            {isEditing ? 'Editar Notificação' : 'Nova Notificação'}
          </h1>
        </div>
      </div>

      {isEditing && isLoading ? (
        <div className="pt-20 px-4 flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="pt-20 px-4 flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="text-destructive text-center">
            <h2 className="text-lg font-semibold mb-2">Erro ao carregar notificação</h2>
            <p className="text-sm">{error.message}</p>
          </div>
          <Button onClick={() => setLocation('/admin/notifications-mobile')}>
            Voltar para lista
          </Button>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="pt-20 px-4 space-y-4">
        <div>
          <Label htmlFor="notification-title">Título <span className="text-destructive">*</span></Label>
          <Input
            id="notification-title"
            {...form.register("title")}
            placeholder="Digite o título da notificação"
            data-testid="input-notification-title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="notification-description">Descrição <span className="text-destructive">*</span></Label>
          <Textarea
            id="notification-description"
            {...form.register("description")}
            placeholder="Descrição da notificação"
            data-testid="textarea-notification-description"
          />
          {form.formState.errors.description && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.description.message}</p>
          )}
        </div>

        <ImageUpload
          id="notification-image"
          label="Imagem da Notificação"
          value={form.watch("imageUrl")}
          onChange={(base64) => form.setValue("imageUrl", base64)}
          placeholder="Selecionar imagem da notificação"
        />

        <div>
          <Label htmlFor="notification-link">URL de Destino</Label>
          <Input
            id="notification-link"
            {...form.register("linkUrl")}
            placeholder="https://exemplo.com/destino"
            data-testid="input-notification-link"
          />
        </div>

        <FormField
          control={form.control}
          name="targetAudience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Público-Alvo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-notification-audience">
                    <SelectValue placeholder="Selecione o público-alvo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="free">Usuários gratuitos</SelectItem>
                  <SelectItem value="premium">Usuários premium</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="notification-start-datetime">Data/Hora Inicial</Label>
            <Input
              id="notification-start-datetime"
              type="datetime-local"
              {...form.register("startDateTime")}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  form.setValue("startDateTime", "");
                }
              }}
              data-testid="input-notification-start-datetime"
            />
          </div>

          <div>
            <Label htmlFor="notification-end-datetime">Data/Hora Final</Label>
            <Input
              id="notification-end-datetime"
              type="datetime-local"
              {...form.register("endDateTime")}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.preventDefault();
                  form.setValue("endDateTime", "");
                }
              }}
              data-testid="input-notification-end-datetime"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={form.watch("isActive") || false}
            onCheckedChange={(checked) => form.setValue("isActive", checked)}
            data-testid="switch-notification-active"
          />
          <Label>Notificação Ativa</Label>
        </div>

        <Button
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={mutation.isPending}
          data-testid="button-save-notification"
        >
          {mutation.isPending ? "Salvando..." : isEditing ? "Atualizar Notificação" : "Criar Notificação"}
        </Button>
        </form>
        </Form>
      )}
    </div>
  );
}