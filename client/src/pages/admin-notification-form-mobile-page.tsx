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
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/admin/notifications-mobile/edit/:id");
  const notificationId = match && params && params.id ? String(params.id) : undefined;
  const isEditing = Boolean(match && notificationId);

  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  const { data: notification, isLoading, error } = useQuery<Notification>({
    queryKey: ['/api/admin/notifications', notificationId],
    queryFn: async () => {
      if (!notificationId) throw new Error('ID não fornecido');
      console.log('Buscando notificação para edição:', notificationId);
      const res = await fetch(`/api/admin/notifications/${notificationId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Erro ao carregar notificação');
      const data = await res.json();
      console.log('Notificação carregada:', data);
      return data;
    },
    enabled: Boolean(isEditing && notificationId),
  });

  // Mostrar erro se houver
  useEffect(() => {
    if (error) {
      console.error('Erro ao carregar notificação:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados da notificação",
      });
    }
  }, [error, toast]);

  const form = useForm<z.infer<typeof insertNotificationSchema>>({
    resolver: zodResolver(insertNotificationSchema),
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
      linkUrl: "",
      targetAudience: "all",
      isActive: false,
      startDateTime: "",
      endDateTime: "",
    },
  });

  // Reset form when notification data loads or ID changes
  useEffect(() => {
    if (notification && isEditing) {
      console.log('Populando formulário com dados da notificação:', notification);
      form.reset({
        title: notification.title,
        description: notification.description,
        imageUrl: notification.imageUrl || "",
        linkUrl: notification.linkUrl || "",
        targetAudience: notification.targetAudience,
        isActive: notification.isActive,
        startDateTime: notification.startDateTime ? 
          new Date(notification.startDateTime).toISOString().slice(0, 16) : "",
        endDateTime: notification.endDateTime ? 
          new Date(notification.endDateTime).toISOString().slice(0, 16) : "",
      });
    } else if (!isEditing) {
      console.log('Resetando formulário para nova notificação');
      form.reset({
        title: "",
        description: "",
        imageUrl: "",
        linkUrl: "",
        targetAudience: "all",
        isActive: false,
        startDateTime: "",
        endDateTime: "",
      });
    }
  }, [notification, isEditing, form]);

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertNotificationSchema>) => {
      if (isEditing) {
        return await apiRequest('PUT', `/api/notifications/${notificationId}`, data);
      } else {
        return await apiRequest('POST', '/api/notifications', data);
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
