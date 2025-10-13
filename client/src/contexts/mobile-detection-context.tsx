import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const MOBILE_BREAKPOINT = 768;
const STORAGE_KEY = 'beleza-luci-is-mobile';

interface MobileDetectionContextType {
  isMobile: boolean | undefined;
  isDetected: boolean;
}

const MobileDetectionContext = createContext<MobileDetectionContextType | undefined>(undefined);

// Cache global para evitar re-detecções
let globalMobileState: boolean | undefined = undefined;
let globalDetected = false;

function detectIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
}

function getInitialValue(): boolean | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  
  // SEMPRE verificar o viewport atual primeiro para evitar cache desatualizado
  const currentValue = detectIsMobile();
  
  // Se temos cache e está correto, usar ele apenas para sinalizar que já detectamos
  if (globalDetected && globalMobileState === currentValue) {
    return currentValue;
  }
  
  // Tentar recuperar do localStorage apenas para verificação
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const storedValue = JSON.parse(stored);
      // Só usar cache se ainda estiver correto
      if (storedValue === currentValue) {
        globalMobileState = currentValue;
        globalDetected = true;
        return currentValue;
      }
    }
  } catch (e) {
    // Ignorar erros de localStorage
  }
  
  // Usar sempre o valor atual e atualizar cache
  globalMobileState = currentValue;
  globalDetected = true;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentValue));
  } catch (e) {
    // Ignorar erros de localStorage
  }
  
  return currentValue;
}

export function MobileDetectionProvider({ children }: { children: ReactNode }) {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(() => getInitialValue());
  const [isDetected, setIsDetected] = useState(globalDetected);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    const onChange = () => {
      const newValue = detectIsMobile();
      setIsMobile(newValue);
      globalMobileState = newValue;
      globalDetected = true;
      setIsDetected(true);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));
      } catch (e) {
        // Ignorar erros de localStorage
      }
    };
    
    // SEMPRE registrar o listener para manter responsividade
    mql.addEventListener("change", onChange);
    
    // Sempre garantir que temos o valor mais atual após o mount
    const currentValue = detectIsMobile();
    
    // Se o cache difere do valor atual, atualizar imediatamente
    if (globalMobileState !== currentValue || !globalDetected) {
      setIsMobile(currentValue);
      globalMobileState = currentValue;
      globalDetected = true;
      setIsDetected(true);
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentValue));
      } catch (e) {
        // Ignorar erros de localStorage
      }
    } else {
      // Cache está correto, apenas certificar que o estado local está atualizado
      setIsMobile(currentValue);
      setIsDetected(true);
    }
    
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return (
    <MobileDetectionContext.Provider value={{ isMobile, isDetected }}>
      {children}
    </MobileDetectionContext.Provider>
  );
}

export function useMobileDetection() {
  const context = useContext(MobileDetectionContext);
  if (context === undefined) {
    throw new Error('useMobileDetection must be used within a MobileDetectionProvider');
  }
  return context;
}

// Hook compatível com o anterior para manter compatibilidade
export function useIsMobile() {
  const { isMobile } = useMobileDetection();
  return isMobile;
}