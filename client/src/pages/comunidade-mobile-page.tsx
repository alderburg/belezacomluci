import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Post, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import MobileBottomNav from "@/components/mobile-bottom-nav";
import EnhancedPostCard from '@/components/enhanced-post-card';
import BannerCarousel from '@/components/banner-carousel';
import { 
  ArrowLeft, 
  Users, 
  Heart, 
  MessageCircle, 
  Share2,
  TrendingUp,
  Sparkles,
  Camera,
  Edit3,
  Loader2,
  Image as ImageIcon,
  X
} from "lucide-react";
import { useCommunityLoading } from "@/hooks/use-community-loading";
import { useToast } from "@/hooks/use-toast";
import { useDataSync } from "@/hooks/use-data-sync";

// Adicionar estilos para ocultar scrollbar
const hideScrollbarStyle = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = hideScrollbarStyle;
  document.head.appendChild(styleElement);
}

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
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.065 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
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
          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509-.03.658-.75 1.074-1.064 1.21-.478.202-1.781.608-2.729.84-. 1.17.66 0 .075.003.149.015.225.1.494.375.914.57 1.244.06.104.226.195.375.255.494.195 1.529.608 1.529 1.273 0 .9-1.199 1.004-1.709 1.004-.225 0-.39-.03-.57-.062-.525-.104-1.049-.104-1.574-.104-.705 0-1.17.044-1.678.134-1.064.164-1.664.893-2.639 2.009-.578.658-1.227 1.408-2.064 2.009-.27.196-.539.301-.869.301-.165 0-.375-.015-.58-.06-.359-.074-1.139-.27-1.559-1.139-.12-.269-.18-.57-.18-.898 0-.405.105-.855.375-1.244.09-.149.225-.285.375-.405.33-.27.733-.405 1.168-.405.075 0 .15.015.225.015.48.06.765.105 1.124.075.194 0 .359-.03.509-.075-1.049-1.363-1.709-2.609-2.879-2.609-1.079 0-1.709.27-2.879.27-.704 0-1.318-.12-1.798-.359-.39-.196-.645-.464-.765-.84-.075-.225-.075-.495 0-.795.134-.405.404-.719.824-.959.404-.18.749-.21 1.168-.21.959 0 1.619.285 2.189.674.314.21.584.435.884.66.16.119.315.225.494.33.09-.031.195-.091.315-.181l.015-.015c.06-.135 1.526-3.476 4.791-4.013.255-.045.435-.27.42-.51-.03-.659-.75-1.074-1.064-1.21-.478-.202-1.781-.608-2.729-.84-. 1.17.66 0 .075.003.149.015.225.1.494.375.914.57 1.244.06.104.226.195.375.255.494.195 1.529.608 1.529 1.273 0 .9-1.199 1.004-1.709 1.004-.225 0-.39-.03-.57-.062-.525-.104-1.049-.104-1.574-.104-.705 0-1.17.044-1.678.134-1.064.164-1.664.893-2.639 2.009-.578.658-1.227 1.408-2.064 2.009-.27.196-.539.301-.869.301-.165 0-.375-.015-.58-.06-.359-.074-1.139-.27-1.559-1.139-.12-.269-.18-.57-.18-.898 0-.405.105-.855.375-1.244.09-.149.225-.285.375-.405.33-.27.733-.405 1.168-.405.075 0 .15.015.225.015.48.06.765.105 1.124.075.194 0 .359-.03.509-.075-1.049-1.363-1.709-2.609-2.879-2.609-1.079 0-1.709.27-2.879.27-.704 0-1.318-.12-1.798-.359-.39-.196-.645-.464-.765-.84-.075-.225-.075-.495 0-.795.134-.405.404-.719.824-.959.404-.18.749-.21 1.168-.21.959 0 1.619.285 2.189.674.314.21.584.435.884.66.16.119.315.225.494.33z"/>
        </svg>
      ),
      color: "#FFFC00"
    },
    whatsapp: {
      name: "WhatsApp",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.02-.57-.02-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
    },
    email: {
      name: "Email",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      ),
      color: "#EA4335"
    }
  };

  return socialIcons[type.toLowerCase()] || socialIcons.instagram;
};

export default function ComunidadeMobilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Hook para sincronização de dados em tempo real
  useDataSync(['/api/admin/community-settings', '/api/posts']);

  // Estados para configurações da comunidade
  const [communityTitle, setCommunityTitle] = useState<string>("");
  const [communitySubtitle, setCommunitySubtitle] = useState<string>("");
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [mobileBackgroundImage, setMobileBackgroundImage] = useState<string>("");

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

  // Estados para criação de post
  const [isCreatingPost, setIsCreatingPost] = useState<boolean>(false);
  const [postContent, setPostContent] = useState<string>("");
  const [postImage, setPostImage] = useState<string>("");
  const [isSubmittingPost, setIsSubmittingPost] = useState<boolean>(false);

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
    enabled: true
  });

  React.useEffect(() => {
    if (communitySettings) {
      setCommunityTitle(communitySettings.title || "");
      setCommunitySubtitle(communitySettings.subtitle || "");
      setBackgroundImage(communitySettings.backgroundImage || "");
      setMobileBackgroundImage(communitySettings.mobileBackgroundImage || communitySettings.backgroundImage || "");
    }
  }, [communitySettings]);

  const { posts, isLoading: postsLoading, refetch: refetchPosts } = useCommunityLoading();
  const isPageLoading = settingsLoading || postsLoading || !communitySettings;

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

  const communityStats = {
    cheirosas: usersCount || 0,
    postagens: postsCount || 0,
    curtidas: likesCount || 0,
    comentarios: commentsCount || 0,
    compartilhamentos: sharesCount || 0
  };

  const handleBackClick = () => {
    setLocation('/');
  };

  const handleElementClick = (elementType: string, currentValue?: string, secondaryValue?: string) => {
    if (!user?.isAdmin) return;

    setEditingElement(elementType);
    setEditingValue(currentValue || "");
    setEditingSecondaryValue(secondaryValue || "");
  };

  const handleSocialClick = (social: any, index: number) => {
    if (!user?.isAdmin) {
      // Para usuários não-admin, tenta abrir o link diretamente, formatando para mailto: se for email
      const url = social.type?.toLowerCase() === 'email' ? `mailto:${social.url}` : social.url;
      window.open(url, '_blank');
      return;
    }

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
      const url = social.type?.toLowerCase() === 'email' ? `mailto:${social.url}` : social.url;
      window.open(url, '_blank');
    }

    setSocialActionModal({ isOpen: false });
  };

  const handleSaveEdit = async () => {
    if (!editingElement || isSaving) return;

    setIsSaving(true);

    try {
      if (editingElement === 'community_title' || editingElement === 'community_subtitle') {
        const response = await fetch('/api/admin/community-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            title: editingElement === 'community_title' ? editingValue : communityTitle,
            subtitle: editingElement === 'community_subtitle' ? editingValue : communitySubtitle,
            backgroundImage: backgroundImage,
            mobileBackgroundImage: mobileBackgroundImage
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save community settings');
        }

        if (editingElement === 'community_title') {
          setCommunityTitle(editingValue);
        } else if (editingElement === 'community_subtitle') {
          setCommunitySubtitle(editingValue);
        }

        refetchCommunitySettings();
        queryClient.invalidateQueries({ queryKey: ["/api/admin/community-settings"] });

      } else if (editingElement.startsWith('social-')) {
        // Edição de rede social - sincronizar com perfil do usuário
        const index = parseInt(editingElement.split('-')[1]);
        const updatedSocialNetworks = [...userSocialNetworks];

        if (updatedSocialNetworks[index]) {
          updatedSocialNetworks[index] = {
            ...updatedSocialNetworks[index],
            url: editingValue,
            name: editingSecondaryValue // Assuming secondary value is the name
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

        // Invalidate user profile query to refetch updated data
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
        // Reloading the page to ensure all parts of the UI reflect the changes, especially the user object which might be used elsewhere.
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
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      setIsUploadingBackground(true);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        setMobileBackgroundImage(base64Data);

        try {
          const response = await fetch('/api/admin/community-settings', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              title: communityTitle,
              subtitle: communitySubtitle,
              backgroundImage: backgroundImage,
              mobileBackgroundImage: base64Data
            })
          });

          if (!response.ok) {
            throw new Error('Failed to save mobile background image');
          }

          refetchCommunitySettings();
          queryClient.invalidateQueries({ queryKey: ["/api/admin/community-settings"] });


          toast({
            title: "Sucesso!",
            description: "Imagem de fundo mobile salva com sucesso!",
            variant: "default",
          });
        } catch (error) {
          console.error('Error saving mobile background image:', error);
          toast({
            title: "Erro",
            description: "Não foi possível salvar a imagem no banco de dados.",
            variant: "destructive",
          });
        } finally {
          setIsUploadingBackground(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundClick = () => {
    if (!user?.isAdmin) return;

    const fileInput = document.getElementById('mobile-background-image-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleCreatePost = () => {
    setIsCreatingPost(true);
  };

  const handleCancelPost = () => {
    setIsCreatingPost(false);
    setPostContent("");
    setPostImage("");
  };

  const handlePostImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione apenas arquivos de imagem.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setPostImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitPost = async () => {
    if (!postContent.trim()) {
      toast({
        title: "Erro",
        description: "O conteúdo do post não pode estar vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingPost(true);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: postContent,
          imageUrl: postImage || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      handleCancelPost();
      refetchPosts();
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });


      toast({
        title: "Sucesso!",
        description: "Post criado com sucesso!",
        variant: "default",
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o post.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPost(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackClick}
              className="text-muted-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="text-left flex-1 ml-4">
              <h1 className="text-lg font-semibold text-foreground">Comunidade</h1>
              <p className="text-sm text-muted-foreground">Conecte-se com outras cheirosas</p>
            </div>
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>

        <main className="pt-24 px-4 pb-4">
          <div className="mb-6">
            <Skeleton className="w-full h-48 rounded-xl mb-4" />
          </div>

          <Card className="mb-6">
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

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start space-x-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-24 w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </main>

        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 py-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackClick}
            className="text-muted-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="text-left flex-1 ml-4">
            <h1 className="text-lg font-semibold text-foreground">Comunidade</h1>
            <p className="text-sm text-muted-foreground">Conecte-se com outras cheirosas</p>
          </div>
          <Users className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Main Content */}
      <main className="pt-16">
        {/* Banner Carousel */}
        <BannerCarousel page="community" />

        <div className="relative mb-6 overflow-hidden rounded-xl mt-6 px-4">

          {/* Input de arquivo oculto para mobile */}
          {user?.isAdmin && (
            <input
              type="file"
              id="mobile-background-image-input"
              accept="image/*"
              onChange={handleBackgroundImageUpload}
              className="hidden"
            />
          )}

          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${mobileBackgroundImage})` }}
          />

          {/* Botão de edição da imagem mobile */}
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

          <Card className="relative border-none bg-transparent shadow-none">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-20 h-20 border-4 border-white shadow-xl ring-4 ring-primary/20">
                    <AvatarImage src={user?.avatar} alt={user?.name} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                      {user?.name?.charAt(0).toUpperCase() || 'BL'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-gradient-to-r from-accent to-primary rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <div 
                    className={`relative group ${user?.isAdmin ? 'cursor-pointer' : ''}`}
                    onClick={() => user?.isAdmin && handleElementClick('community_title', communityTitle)}
                  >
                    <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                      {communityTitle}
                    </h1>
                    {user?.isAdmin && (
                      <Edit3 className="absolute -top-2 -right-6 w-3 h-3 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <div 
                    className={`relative group ${user?.isAdmin ? 'cursor-pointer' : ''}`}
                    onClick={() => user?.isAdmin && handleElementClick('community_subtitle', communitySubtitle)}
                  >
                    <p className="text-white/90 text-sm font-medium max-w-xs leading-relaxed whitespace-pre-wrap drop-shadow">
                      {communitySubtitle}
                    </p>
                    {user?.isAdmin && (
                      <Edit3 className="absolute -top-1 -right-6 w-3 h-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-3 flex-wrap">
                  {userSocialNetworks.map((network: any, index: number) => {
                    const socialData = getSocialIcon(network.type);

                    // Formatar URL do email como mailto:
                    const linkUrl = network.type?.toLowerCase() === 'email' 
                      ? `mailto:${network.url}` 
                      : network.url;

                    // Se for admin, usa onClick, senão usa link direto
                    if (user?.isAdmin) {
                      return (
                        <div 
                          key={`${network.type}-${index}`}
                          className="relative group cursor-pointer"
                          onClick={() => handleSocialClick({ name: socialData.name, url: network.url, ...socialData }, index)}
                        >
                          <div
                            className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all duration-300 bg-white/90 backdrop-blur-sm hover:bg-white/95"
                            style={{ 
                              borderColor: socialData.color,
                              color: socialData.color
                            }}
                          >
                            {socialData.icon}
                          </div>
                          <Edit3 className="absolute -top-1 -right-1 w-3 h-3 text-white bg-primary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      );
                    }

                    // Para usuários normais, link direto
                    return (
                      <a
                        key={`${network.type}-${index}`}
                        href={linkUrl || '#'}
                        target={network.type?.toLowerCase() !== 'email' && linkUrl?.startsWith('http') ? "_blank" : undefined}
                        rel={network.type?.toLowerCase() !== 'email' && linkUrl?.startsWith('http') ? "noopener noreferrer" : undefined}
                        className="relative group"
                      >
                        <div
                          className="w-10 h-10 rounded-full border-2 flex items-center justify-center hover:scale-110 transition-all duration-300 bg-white/90 backdrop-blur-sm hover:bg-white/95"
                          style={{ 
                            borderColor: socialData.color,
                            color: socialData.color
                          }}
                        >
                          {socialData.icon}
                        </div>
                      </a>
                    );
                  })}
                </div>

                <div className="w-full mt-2 overflow-x-auto scrollbar-hide touch-pan-x" style={{ WebkitOverflowScrolling: 'touch' }}>
                  <div className="flex gap-3 pb-2 px-1" style={{ width: 'max-content' }}>
                    <Card className="bg-white/10 backdrop-blur-sm border-white/20 flex-shrink-0 w-28">
                      <CardContent className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Users className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-lg font-bold text-white">{communityStats.cheirosas}</p>
                        <p className="text-xs text-white/80">Cheirosas</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-sm border-white/20 flex-shrink-0 w-28">
                      <CardContent className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-lg font-bold text-white">{communityStats.postagens}</p>
                        <p className="text-xs text-white/80">Postagens</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-sm border-white/20 flex-shrink-0 w-28">
                      <CardContent className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Heart className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-lg font-bold text-white">{communityStats.curtidas}</p>
                        <p className="text-xs text-white/80">Curtidas</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-sm border-white/20 flex-shrink-0 w-32">
                      <CardContent className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-lg font-bold text-white">{communityStats.comentarios}</p>
                        <p className="text-xs text-white/80">Comentários</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white/10 backdrop-blur-sm border-white/20 flex-shrink-0 w-36">
                      <CardContent className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Share2 className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-lg font-bold text-white">{communityStats.compartilhamentos}</p>
                        <p className="text-xs text-white/80 whitespace-nowrap">Compartilhamentos</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Card Criar Post Mobile Melhorado */}
        <Card className="mb-6">
          <CardContent className="p-4">
            {!isCreatingPost ? (
              <div className="flex items-center space-x-3" onClick={handleCreatePost}>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-white">
                    {user?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 bg-muted rounded-full px-4 py-3 cursor-pointer hover:bg-muted/80 transition-colors">
                  <p className="text-muted-foreground text-sm">O que você está pensando?</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Criar Publicação</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelPost}
                    disabled={isSubmittingPost}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="O que você está pensando?"
                  className="min-h-[100px] resize-none border-0 bg-transparent text-base placeholder:text-muted-foreground focus-visible:ring-0"
                  disabled={isSubmittingPost}
                />

                {postImage && (
                  <div className="relative">
                    <img
                      src={postImage}
                      alt="Preview"
                      className="w-full max-h-64 object-cover rounded-lg"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setPostImage("")}
                      disabled={isSubmittingPost}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      id="post-image-input"
                      accept="image/*"
                      onChange={handlePostImageUpload}
                      className="hidden"
                      disabled={isSubmittingPost}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById('post-image-input')?.click()}
                      disabled={isSubmittingPost}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Foto
                    </Button>
                  </div>

                  <Button
                    onClick={handleSubmitPost}
                    disabled={isSubmittingPost || !postContent.trim()}
                    size="sm"
                  >
                    {isSubmittingPost ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      'Publicar'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {posts && posts.length > 0 ? (
            posts.map((post: PostWithUser) => (
              <EnhancedPostCard key={post.id} post={post} />
            ))
          ) : (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    Nenhuma postagem ainda
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Seja a primeira a compartilhar algo incrível!
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      <MobileBottomNav />

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
                editingElement === 'community_title' ? 'Título da Comunidade' :
                editingElement === 'community_subtitle' ? 'Subtítulo da Comunidade' :
                editingElement?.startsWith('social-') ? 'Rede Social' :
                'Elemento'
              }
            </DialogTitle>
            <DialogDescription>
              {editingElement === 'community_title' ? 'Altere o título da comunidade' :
               editingElement === 'community_subtitle' ? 'Atualize o subtítulo da comunidade' :
               editingElement?.startsWith('social-') ? 'Edite as informações da rede social' :
               'Modifique as informações do elemento'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingElement === 'community_subtitle' ? (
              <div className="space-y-2">
                <Label>Subtítulo da Comunidade</Label>
                <Textarea
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  placeholder="Digite o subtítulo da comunidade..."
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
                  {editingElement === 'community_title' ? 'Título da Comunidade' : 'Valor'}
                </Label>
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  placeholder={
                    editingElement === 'community_title' ? 'Digite o título da comunidade...' :
                    'Digite o novo valor...'
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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