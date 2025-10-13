import Sidebar from "@/components/sidebar";
import EnhancedPostCard from "@/components/enhanced-post-card";
import CreatePostCard from "@/components/create-post-card";
import BannerCarousel from "@/components/banner-carousel";
import { useQuery } from "@tanstack/react-query";
import { Post, User } from "@shared/schema";
import { useCommunityLoading } from "@/hooks/use-community-loading";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ExternalLink, Heart, Users, Star, TrendingUp, Sparkles, MessageCircle, Share2, FileText, Edit3, Camera, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { PopupSystem } from "@/components/popup-system";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type PostWithUser = Post & {
  user: Pick<User, 'id' | 'name' | 'avatar' | 'isAdmin'>
};

// Função para obter ícone e cor baseado no tipo de rede social
const getSocialIcon = (type: string) => {
  const socialIcons: Record<string, { icon: JSX.Element; color: string; name: string }> = {
    instagram: {
      name: "Instagram",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      color: "#E4405F"
    },
    tiktok: {
      name: "TikTok",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      ),
      color: "#000000"
    },
    youtube: {
      name: "YouTube",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      color: "#FF0000"
    },
    facebook: {
      name: "Facebook",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      color: "#1877F2"
    },
    twitter: {
      name: "Twitter/X",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      color: "#000000"
    },
    linkedin: {
      name: "LinkedIn",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
      color: "#0077B5"
    },
    pinterest: {
      name: "Pinterest",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.690 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.350-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/>
        </svg>
      ),
      color: "#E60023"
    },
    snapchat: {
      name: "Snapchat",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.166.005C9.408.005 7.85 1.974 7.85 4.394c0 .65.093 1.298.29 1.918-.257.054-.52.098-.806.127-.207.02-.39.177-.422.391-.033.224.097.418.304.497.113.044.227.085.344.121.425.126 1.018.331 1.189.724.081.202.057.476-.114.792-.016.034-1.462 3.332-4.621 3.855-.234.039-.395.245-.383.473.026.598.681.979.962 1.1.434.187 1.613.561 2.472.725a5.92 5.92 0 00-.184.862c-.026.161-.018.309.021.432.095.311.326.519.649.587.127.024.261.036.396.036.453 0 .968-.101 1.54-.205.486-.088.973-.16 1.489-.16.504 0 .99.071 1.442.155.581.108 1.099.21 1.556.21.143 0 .281-.012.411-.038.333-.073.562-.282.655-.596.035-.119.042-.264.017-.421-.059-.364-.127-.688-.184-.863.859-.163 2.038-.537 2.471-.724.281-.121.936-.502.962-1.1.012-.228-.149-.434-.383-.473-3.16-.523-4.606-3.821-4.621-3.855-.171-.316-.195-.59-.114-.792.17-.393.764-.598 1.189-.724.117-.036.231-.077.344-.121.207-.079.337-.273.304-.497a.475.475 0 00-.422-.391c-.286-.029-.549-.073-.806-.127.197-.62.29-1.268.29-1.918 0-2.42-1.558-4.389-4.316-4.389z"/>
        </svg>
      ),
      color: "#FFFC00"
    },
    whatsapp: {
      name: "WhatsApp",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      color: "#25D366"
    },
    telegram: {
      name: "Telegram",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      color: "#0088CC"
    }
  };

  return socialIcons[type.toLowerCase()] || socialIcons.instagram;
};

export default function CommunityPage() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();

  // Estados para edição
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [editingSecondaryValue, setEditingSecondaryValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingBackground, setIsUploadingBackground] = useState<boolean>(false);

  // Redes sociais do usuário (sincronizadas com perfil)
  const userSocialNetworks = user?.socialNetworks || [];

  // Estados para modal de ação de rede social
  const [socialActionModal, setSocialActionModal] = useState<{
    isOpen: boolean;
    social?: any;
    index?: number;
  }>({ isOpen: false });

  // Estados para configurações da comunidade
  const [communityTitle, setCommunityTitle] = useState<string>("");
  const [communitySubtitle, setCommunitySubtitle] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");

  // Query para carregar configurações da comunidade (sempre ativa)
  const { data: communitySettings, isLoading: settingsLoading, refetch: refetchCommunitySettings } = useQuery({
    queryKey: ["/api/admin/community-settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/community-settings", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch community settings');
      }
      return response.json();
    },
    enabled: true // Sempre habilitado para carregar dados
  });

  // Atualizar estados quando os dados carregam
  React.useEffect(() => {
    if (communitySettings) {
      setCommunityTitle(communitySettings.title || "");
      setCommunitySubtitle(communitySettings.subtitle || "");
      setBackgroundImage(communitySettings.backgroundImage || "");
    }
  }, [communitySettings]);

  const { data: banners } = useQuery<any[]>({
    queryKey: ["/api/banners"],
  });

  // Verificar se há banners ativos na página community
  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "community") || [];
  const hasActiveBanners = activeBanners.length > 0;

  // Sistema de loading inteligente que considera todas as queries
  const { posts, isLoading: postsLoading } = useCommunityLoading();

  // Loading geral da página - deve aguardar configurações E posts
  const isPageLoading = settingsLoading || postsLoading || !communitySettings;

  // Buscar estatísticas reais da comunidade
  const { data: usersCount } = useQuery<number>({
    queryKey: ["/api/users/count"],
  });

  const { data: postsCount } = useQuery<number>({
    queryKey: ["/api/posts/count"],
  });

  const { data: likesCount } = useQuery<number>({
    queryKey: ["/api/posts/likes/count"],
  });

  const { data: commentsCount } = useQuery<number>({
    queryKey: ["/api/posts/comments/count"],
  });

  const { data: sharesCount } = useQuery<number>({
    queryKey: ["/api/posts/shares/count"],
  });

  // Estatísticas da comunidade com dados reais
  const communityStats = {
    cheirosas: usersCount || 0,
    postagens: postsCount || 0,
    curtidas: likesCount || 0,
    comentarios: commentsCount || 0,
    compartilhamentos: sharesCount || 0
  };

  // Funções de edição
  const handleElementClick = (elementType: string, currentValue?: string, secondaryValue?: string) => {
    if (!user?.isAdmin) return;

    setEditingElement(elementType);
    setEditingValue(currentValue || "");
    setEditingSecondaryValue(secondaryValue || "");
  };

  const handleSocialClick = (social: any, index: number) => {
    if (!user?.isAdmin) {
      // Se não for admin, apenas abre o link
      window.open(social.url, '_blank');
      return;
    }

    // Se for admin, abre modal para escolher ação
    setSocialActionModal({
      isOpen: true,
      social,
      index
    });
  };

  const handleSocialAction = (action: 'edit' | 'visit') => {
    const { social, index } = socialActionModal;

    if (action === 'edit' && social && index !== undefined) {
      setEditingElement(`social-${index}`);
      setEditingValue(social.url);
      setEditingSecondaryValue(social.name);
    } else if (action === 'visit' && social) {
      window.open(social.url, '_blank');
    }

    setSocialActionModal({ isOpen: false });
  };

  const handleSaveEdit = async () => {
    if (!editingElement || isSaving) return;

    setIsSaving(true);

    try {
      // Verificar se é edição das configurações da comunidade
      if (editingElement === 'community_title' || editingElement === 'community_subtitle') {
        // Salvar configurações da comunidade
        const response = await fetch('/api/admin/community-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: editingElement === 'community_title' ? editingValue : communityTitle,
            subtitle: editingElement === 'community_subtitle' ? editingValue : communitySubtitle,
            backgroundImage: backgroundImage
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save community settings');
        }

        // Atualizar estados locais
        if (editingElement === 'community_title') {
          setCommunityTitle(editingValue);
        } else if (editingElement === 'community_subtitle') {
          setCommunitySubtitle(editingValue);
        }

        // Recarregar configurações
        refetchCommunitySettings();
      } else if (editingElement.startsWith('social-')) {
        // Edição de rede social - sincronizar com perfil do usuário
        const index = parseInt(editingElement.split('-')[1]);
        const updatedSocialNetworks = [...userSocialNetworks];

        if (updatedSocialNetworks[index]) {
          updatedSocialNetworks[index] = {
            ...updatedSocialNetworks[index],
            url: editingValue
          };
        }

        // Salvar no perfil do usuário
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: user?.name,
            email: user?.email,
            socialNetworks: updatedSocialNetworks
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update social networks');
        }

        // Recarregar dados do usuário
        window.location.reload();
      }

      setEditingElement(null);

      toast({
        title: "Sucesso!",
        description: "Alteração salva com sucesso!",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving edit:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a alteração.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackgroundImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      // Verificar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Ativar loading
      setIsUploadingBackground(true);

      // Converter para base64 para preview imediato
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        setBackgroundImage(base64Data);

        try {
          // Salvar no banco de dados
          const response = await fetch('/api/admin/community-settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              title: communityTitle,
              subtitle: communitySubtitle,
              backgroundImage: base64Data
            })
          });

          if (!response.ok) {
            throw new Error('Failed to save background image');
          }

          // Recarregar configurações
          refetchCommunitySettings();

          toast({
            title: "Sucesso!",
            description: "Imagem de fundo salva com sucesso!",
            variant: "default",
          });
        } catch (error) {
          console.error('Error saving background image:', error);
          toast({
            title: "Erro",
            description: "Não foi possível salvar a imagem no banco de dados.",
            variant: "destructive",
          });
        } finally {
          // Desativar loading
          setIsUploadingBackground(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundClick = () => {
    if (!user?.isAdmin) return;

    // Trigger o input file
    const fileInput = document.getElementById('background-image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  // Se estiver carregando, mostra skeleton completo
  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />

        <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
          <BannerCarousel page="community" />

          <div className={`container mx-auto px-6 py-8 ${!hasActiveBanners ? (isMobile ? 'pt-32' : 'pt-20') : ''}`}>
            {/* Header Skeleton */}
            <div className="relative mb-8 overflow-hidden rounded-2xl">
              <Skeleton className="w-full h-80" />
              <Card className="relative border-none bg-transparent shadow-none rounded-2xl m-4">
                <CardContent className="p-8">
                  <div className="grid md:grid-cols-3 gap-8 items-center">
                    <div className="md:col-span-2 flex flex-col md:flex-row items-center md:items-start gap-6">
                      <Skeleton className="w-28 h-28 rounded-full" />
                      <div className="text-center md:text-left flex-1 space-y-4">
                        <div className="space-y-2">
                          <Skeleton className="h-12 w-80" />
                          <Skeleton className="h-6 w-96" />
                        </div>
                        <div className="flex justify-center md:justify-start gap-3">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="w-10 h-10 rounded-full" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Skeleton className="h-20 rounded-xl" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Create Post Skeleton */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts Skeleton */}
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex items-start space-x-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-32 w-full" />
                      <div className="flex space-x-4">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
        <PopupSystem trigger="page_specific" targetPage="community" />
        <BannerCarousel page="community" />

        <div className={`container mx-auto px-6 py-8 ${!hasActiveBanners ? (isMobile ? 'pt-32' : 'pt-20') : ''}`}>

          {/* Header Moderno da Comunidade */}
          <div className="relative mb-8 overflow-hidden rounded-2xl">
            {/* Input de arquivo oculto */}
            {user?.isAdmin && (
              <input
                type="file"
                id="background-image-input"
                accept="image/*"
                onChange={handleBackgroundImageUpload}
                className="hidden"
              />
            )}

            {/* Imagem de fundo */}
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center rounded-2xl"
              style={{ backgroundImage: `url(${backgroundImage})` }}
            />

            {/* Botão de edição da imagem */}
            {user?.isAdmin && (
              <div
                className={`absolute top-4 right-4 group z-10 ${isUploadingBackground ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={!isUploadingBackground ? handleBackgroundClick : undefined}
              >
                <div className={`bg-white/20 backdrop-blur-sm rounded-full p-2 transition-colors ${isUploadingBackground ? 'bg-white/40' : 'hover:bg-white/30'}`}>
                  {isUploadingBackground ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black/70 px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingBackground ? "Salvando..." : "Alterar fundo"}
                </span>
              </div>
            )}

            <Card className="relative border-none bg-transparent shadow-none rounded-2xl m-4">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-3 gap-8 items-center">
                  {/* Perfil Principal */}
                  <div className="md:col-span-2 flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="relative">
                      <Avatar className="w-28 h-28 border-4 border-white shadow-xl ring-4 ring-primary/20">
                        <AvatarImage src={user?.avatar || "/uploads/profileImage-1757186725059-882513415.png"} alt={user?.name || "Beleza com Luci"} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                          BL
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div className="text-center md:text-left flex-1 space-y-4">
                      <div>
                        <div
                          className={`relative group ${user?.isAdmin ? 'cursor-pointer' : ''}`}
                          onClick={() => user?.isAdmin && handleElementClick('community_title', communityTitle)}
                        >
                          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-white/90 bg-clip-text text-transparent mb-2">
                            {communityTitle}
                          </h1>
                          {user?.isAdmin && (
                            <Edit3 className="absolute -top-2 -right-8 w-4 h-4 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        <div
                          className={`relative group ${user?.isAdmin ? 'cursor-pointer' : ''}`}
                          onClick={() => user?.isAdmin && handleElementClick('community_subtitle', communitySubtitle)}
                        >
                          <p className="text-white/90 text-lg font-medium max-w-2xl leading-relaxed whitespace-pre-wrap">
                            {communitySubtitle}
                          </p>
                          {user?.isAdmin && (
                            <Edit3 className="absolute -top-1 -right-6 w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>

                      {/* Redes Sociais Compactas */}
                      <div className="flex justify-center md:justify-start gap-3">
                        {userSocialNetworks.map((network: any, index: number) => {
                          const socialData = getSocialIcon(network.type);
                          const socialClickData = { name: socialData.name, url: network.url, icon: socialData.icon, color: socialData.color };
                          return (
                            <div
                              key={`${network.type}-${index}`}
                              className={`relative group ${user?.isAdmin ? 'cursor-pointer' : ''}`}
                              onClick={() => handleSocialClick(socialClickData, index)}
                            >
                              <div
                                className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all duration-300 bg-white/90 backdrop-blur-sm hover:bg-white/95"
                                style={{
                                  borderColor: socialData.color,
                                  color: socialData.color
                                }}
                                title={`${socialData.name}${user?.isAdmin ? ' (clique para editar ou visitar)' : ''}`}
                              >
                                <div className="group-hover:scale-110 transition-transform">
                                  {socialData.icon}
                                </div>
                              </div>
                              {user?.isAdmin && (
                                <Edit3 className="absolute -top-1 -right-1 w-3 h-3 text-white bg-primary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Estatísticas da Comunidade */}
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/50 space-y-4">
                    <h3 className="font-bold text-lg mb-4 text-center">📊 Nossa Comunidade</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Cheirosas</span>
                        </div>
                        <span className="font-bold text-primary">{communityStats.cheirosas.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent" />
                          <span className="text-sm font-medium">Postagens</span>
                        </div>
                        <span className="font-bold text-accent">{communityStats.postagens.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-medium">Curtidas</span>
                        </div>
                        <span className="font-bold text-red-500">{communityStats.curtidas.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">Comentários</span>
                        </div>
                        <span className="font-bold text-blue-500">{communityStats.comentarios.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-green-500" />
                          <span className="text-sm font-medium">Compartilhamentos</span>
                        </div>
                        <span className="font-bold text-green-500">{communityStats.compartilhamentos.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card Criar Post Melhorado */}
          <div className="mb-8">
            <CreatePostCard />
          </div>

          {/* Timeline de Posts */}
          <div className="space-y-6">
            {posts && posts.length > 0 ? (
              posts.map((post) => (
                <EnhancedPostCard key={post.id} post={post} />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-4xl">📷</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Nenhuma postagem ainda</h3>
                <p className="text-muted-foreground">
                  {user?.isAdmin
                    ? "Seja a primeira a compartilhar algo especial!"
                    : "Aguarde as próximas postagens da Beleza com Luci!"
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Ação das Redes Sociais */}
      <Dialog open={socialActionModal.isOpen} onOpenChange={() => setSocialActionModal({ isOpen: false })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ação da Rede Social</DialogTitle>
            <DialogDescription>
              O que você deseja fazer com {socialActionModal.social?.name}?
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => handleSocialAction('edit')}
              variant="default"
              className="w-full"
            >
              ✏️ Editar {socialActionModal.social?.name}
            </Button>
            <Button
              onClick={() => handleSocialAction('visit')}
              variant="outline"
              className="w-full"
            >
              🌐 Visitar {socialActionModal.social?.name}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={!!editingElement} onOpenChange={() => setEditingElement(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Editar {
                editingElement === 'title' ? 'Título' :
                editingElement === 'bio' ? 'Biografia' :
                editingElement?.startsWith('social-') ? 'Rede Social' :
                'Elemento'
              }
            </DialogTitle>
            <DialogDescription>
              {editingElement === 'title' ? 'Altere o título do perfil' :
               editingElement === 'bio' ? 'Atualize a biografia do perfil' :
               editingElement?.startsWith('social-') ? 'Edite as informações da rede social' :
               'Modifique as informações do elemento'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingElement === 'bio' || editingElement === 'community_subtitle' ? (
              <div className="space-y-2">
                <Label>
                  {editingElement === 'community_subtitle' ? 'Digite a bio' : 'Biografia'}
                </Label>
                <Textarea
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  placeholder={
                    editingElement === 'community_subtitle' ? 'Digite a bio da comunidade...' : 'Digite a nova biografia...'
                  }
                  rows={4}
                />
              </div>
            ) : editingElement?.startsWith('social-') ? (
              <>
                <div className="space-y-2">
                  <Label>Nome da Rede Social</Label>
                  <Input
                    value={editingSecondaryValue}
                    onChange={(e) => setEditingSecondaryValue(e.target.value)}
                    placeholder="Ex: Instagram"
                  />
                </div>
                <div className="space-y-2">
                  <Label>URL</Label>
                  <Input
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    placeholder="Ex: https://www.instagram.com/belezacomluci"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>
                  {editingElement === 'community_title' ? 'Digite o título' :
                   editingElement === 'community_subtitle' ? 'Digite a bio' :
                   editingElement === 'title' ? 'Título' : 'Valor'}
                </Label>
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  placeholder={
                    editingElement === 'community_title' ? 'Digite o título da comunidade...' :
                    editingElement === 'community_subtitle' ? 'Digite a bio da comunidade...' :
                    `Digite o novo ${editingElement === 'title' ? 'título' : 'valor'}...`
                  }
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingElement(null)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}