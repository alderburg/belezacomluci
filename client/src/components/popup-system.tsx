
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useAdmin } from '@/contexts/admin-context';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useLocation } from 'wouter';
import type { Popup } from '@shared/schema';

interface PopupSystemProps {
  trigger: 'login' | 'logout' | 'page_specific' | 'scheduled';
  targetPage?: string;
  targetVideoId?: string;
  targetCourseId?: string;
  onClose?: () => void;
}

export function PopupSystem({ trigger, targetPage, targetVideoId, targetCourseId, onClose }: PopupSystemProps) {
  const { user } = useAuth();
  const { viewMode } = useAdmin();
  const [currentPopup, setCurrentPopup] = useState<Popup | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [, navigate] = useLocation();

  // Query para buscar popups ativos
  const { data: popups, isLoading: isLoadingPopups } = useQuery<Popup[]>({
    queryKey: ['/api/popups', { trigger, targetPage, targetVideoId, targetCourseId }],
    queryFn: async () => {
      const params = new URLSearchParams({ trigger });
      if (targetPage) params.append('targetPage', targetPage);
      if (targetVideoId) params.append('targetVideoId', targetVideoId);
      if (targetCourseId) params.append('targetCourseId', targetCourseId);
      
      const response = await fetch(`/api/popups?${params}`);
      return response.json();
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Mutation para registrar visualização
  const recordViewMutation = useMutation({
    mutationFn: async (popupId: string) => {
      return apiRequest('POST', '/api/popup-views', { popupId });
    },
  });

  // Verificar se deve mostrar popup
  useEffect(() => {
    if (!user) return;

    // Aguardar um pouco para os dados carregarem
    if (popups === undefined) {
      return; // Ainda carregando
    }

    // Se não há popups ou popups está vazio, chama onClose se for trigger exit_intent
    if (!popups || !Array.isArray(popups) || popups.length === 0) {
      if (trigger === 'logout' && onClose) {
        // Para logout, aguarda um pouco para verificar se há popups
        const timer = setTimeout(() => {
          onClose();
        }, 500);
        return () => clearTimeout(timer);
      }
      return;
    }

    const checkAndShowPopup = async (popup: Popup) => {
      // Verificar se é exclusivo para premium
      if (popup.isExclusive) {
        // Se o usuário é admin, usar o viewMode para simular premium/free
        if (user?.isAdmin) {
          // Admin pode testar: se viewMode for 'free', simula usuário free
          if (viewMode === 'free') return false;
        } else {
          // Para usuários normais, verificar subscription real
          const userSubscription = await fetch('/api/user/subscription').then(r => r.json());
          if (userSubscription.planType !== 'premium') return false;
        }
      }

      // Verificar se já foi visto nesta sessão (para popups once_per_session)
      if (popup.showFrequency === 'once_per_session') {
        const sessionKey = `popup_${popup.id}_seen`;
        const hasSeen = sessionStorage.getItem(sessionKey);
        if (hasSeen) return false;
      }

      return true;
    };

    // Processar popups em ordem
    const processPopups = async () => {
      let foundPopup = false;
      
      for (const popup of popups) {
        // Verificar se o popup está ativo
        if (!popup.isActive) {
          continue;
        }
        
        const shouldShow = await checkAndShowPopup(popup);
        
        if (shouldShow) {
          setCurrentPopup(popup);
          setIsOpen(true);
          foundPopup = true;
          break; // Mostrar apenas um popup por vez
        }
      }

      // Se é logout e não encontrou popup válido, chama o callback
      if (!foundPopup && trigger === 'logout' && onClose) {
        setTimeout(() => onClose(), 200);
      }
    };

    processPopups();
  }, [popups, user, viewMode, trigger, onClose]);

  const handleClose = () => {
    if (currentPopup) {
      // Registrar visualização
      recordViewMutation.mutate(currentPopup.id);

      // Marcar como visto na sessão se necessário
      if (currentPopup.showFrequency === 'once_per_session') {
        const sessionKey = `popup_${currentPopup.id}_seen`;
        sessionStorage.setItem(sessionKey, 'true');
      }
    }

    setIsOpen(false);
    setCurrentPopup(null);
    
    // Chamar callback de fechamento se fornecido
    if (onClose) {
      onClose();
    }
  };

  const handleLinkClick = () => {
    if (currentPopup?.linkUrl) {
      const url = currentPopup.linkUrl;
      
      // Check if it's an internal link (same domain or relative path)
      const isInternal = url.startsWith('/') || 
                        url.startsWith('./') || 
                        url.startsWith('../') || 
                        url.includes(window.location.host);
      
      if (isInternal) {
        // For internal links, use wouter navigation without page reload
        const cleanUrl = url.startsWith('/') ? url : '/' + url.replace(/^\.\//, '');
        navigate(cleanUrl);
      } else {
        // For external links, open in new tab
        window.open(url, '_blank');
      }
    }
    handleClose();
  };

  if (!currentPopup) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl p-0 overflow-hidden border-0"
        onPointerDownOutside={handleClose}
        onEscapeKeyDown={handleClose}
        aria-describedby="popup-description"
      >
        <VisuallyHidden>
          <DialogTitle>{currentPopup.title}</DialogTitle>
        </VisuallyHidden>
        <VisuallyHidden>
          <DialogDescription id="popup-description">{currentPopup.description}</DialogDescription>
        </VisuallyHidden>
        
        <div className="relative">
          {/* Botão fechar customizado */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-20 bg-black/30 hover:bg-black/50 text-white rounded-full w-8 h-8"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Imagem do popup */}
          <div className="relative w-full">
            <div 
              className={`relative w-full ${
                currentPopup.linkUrl ? 'cursor-pointer' : ''
              }`}
              onClick={currentPopup.linkUrl ? handleLinkClick : undefined}
            >
              <img
                src={currentPopup.imageUrl}
                alt={currentPopup.title}
                className="w-full h-auto max-h-[70vh] object-cover"
              />
              
              {/* Overlay com conteúdo */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
                <div className="text-white">
                  {(currentPopup.showTitle ?? true) && (
                    <h2 className="text-2xl font-bold mb-2">{currentPopup.title}</h2>
                  )}
                  {(currentPopup.showDescription ?? true) && currentPopup.description && (
                    <p className="text-sm text-white/90 mb-4">{currentPopup.description}</p>
                  )}
                  
                  {(currentPopup.showButton ?? true) && currentPopup.linkUrl && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation(); // Evita duplo clique
                        handleLinkClick();
                      }}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      Saiba Mais
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook para usar o sistema de popups
export const usePopupSystem = () => {
  // Limpar cache de popups ao fazer login (nova sessão)
  const clearPopupCache = () => {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('popup_') && key.endsWith('_seen')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  return { clearPopupCache };
};
