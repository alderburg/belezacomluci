import { createContext, ReactNode, useContext, useState, useEffect } from "react";

type AdminViewMode = 'premium' | 'free';

interface AdminContextType {
  isAdminMode: boolean;
  viewMode: AdminViewMode;
  setAdminMode: (enabled: boolean) => void;
  setViewMode: (mode: AdminViewMode) => void;
  resetViewMode: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

const ADMIN_VIEW_MODE_KEY = 'admin_view_mode';

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [viewMode, setViewMode] = useState<AdminViewMode>(() => {
    // Recupera o viewMode salvo no localStorage
    const savedViewMode = localStorage.getItem(ADMIN_VIEW_MODE_KEY);
    return (savedViewMode as AdminViewMode) || 'premium';
  });

  const setAdminMode = (enabled: boolean) => {
    setIsAdminMode(enabled);
  };

  const handleSetViewMode = (mode: AdminViewMode) => {
    setViewMode(mode);
    // Salva no localStorage para persistir entre reloads
    localStorage.setItem(ADMIN_VIEW_MODE_KEY, mode);
  };

  const resetViewMode = () => {
    setViewMode('premium');
    // Remove do localStorage ao resetar
    localStorage.removeItem(ADMIN_VIEW_MODE_KEY);
  };

  return (
    <AdminContext.Provider
      value={{
        isAdminMode,
        viewMode,
        setAdminMode,
        setViewMode: handleSetViewMode,
        resetViewMode,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}