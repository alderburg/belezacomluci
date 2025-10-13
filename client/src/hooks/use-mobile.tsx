import * as React from "react"

const MOBILE_BREAKPOINT = 768
const STORAGE_KEY = 'beleza-luci-is-mobile'

// Cache da última detecção para evitar recálculos desnecessários
let cachedDetection: boolean | null = null

function detectIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getInitialValue(): boolean {
  // Se já temos uma detecção cached, usar ela
  if (cachedDetection !== null) {
    return cachedDetection
  }
  
  // Tentar recuperar do localStorage como fallback
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) {
        cachedDetection = JSON.parse(stored)
        // Verificar se a detecção stored ainda está correta
        const current = detectIsMobile()
        if (cachedDetection === current) {
          return cachedDetection
        }
      }
    } catch (e) {
      // Ignorar erros de localStorage
    }
    
    // Fazer detecção em tempo real
    cachedDetection = detectIsMobile()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedDetection))
    } catch (e) {
      // Ignorar erros de localStorage
    }
    return cachedDetection
  }
  
  return false
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => getInitialValue())

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      const newValue = detectIsMobile()
      setIsMobile(newValue)
      cachedDetection = newValue
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue))
      } catch (e) {
        // Ignorar erros de localStorage
      }
    }
    
    mql.addEventListener("change", onChange)
    
    // Garantir que a detecção inicial está correta após o mount
    const currentValue = detectIsMobile()
    if (currentValue !== isMobile) {
      setIsMobile(currentValue)
      cachedDetection = currentValue
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentValue))
      } catch (e) {
        // Ignorar erros de localStorage
      }
    }
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
