import { useAdmin } from "@/contexts/admin-context";
import { useAuth } from "@/hooks/use-auth";

export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: 'not-logged-in' | 'free-user' | 'exclusive-content';
}

export function useAccessControl() {
  const { user } = useAuth();
  const { viewMode } = useAdmin();

  const checkAccess = (isExclusive: boolean): AccessCheckResult => {
    // Se o conteúdo não é exclusivo, todos têm acesso
    if (!isExclusive) {
      return { hasAccess: true };
    }

    // Se não está logado, não tem acesso
    if (!user) {
      return { 
        hasAccess: false, 
        reason: 'not-logged-in' 
      };
    }

    // Para conteúdo exclusivo, verifica o viewMode (simulação)
    // Em produção, aqui verificaria a subscription real do usuário
    // Para admins, usamos o viewMode para simular diferentes experiências
    const effectiveViewMode = user?.isAdmin ? viewMode || 'premium' : 'premium';
    
    if (effectiveViewMode === 'free') {
      return { 
        hasAccess: false, 
        reason: 'free-user' 
      };
    }

    // Se chegou até aqui, tem acesso
    return { hasAccess: true };
  };

  const getEffectiveViewMode = () => {
    return user?.isAdmin ? viewMode || 'premium' : 'premium';
  };

  return {
    checkAccess,
    getEffectiveViewMode,
    isAdmin: user?.isAdmin || false,
    isLoggedIn: !!user
  };
}