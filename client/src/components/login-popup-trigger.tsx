
import { useEffect } from 'react';
import { PopupSystem } from './popup-system';
import { useAuth } from '@/hooks/use-auth';

export function LoginPopupTrigger() {
  const { user } = useAuth();

  // Mostrar popup de login apenas uma vez quando o usuário faz login
  useEffect(() => {
    if (user) {
      // Pequeno delay para garantir que a página carregou completamente
      const timer = setTimeout(() => {
        // O PopupSystem irá verificar se há popups de login ativos
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user]);

  if (!user) return null;

  return <PopupSystem trigger="login" />;
}
