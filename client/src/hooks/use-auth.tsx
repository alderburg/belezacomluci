import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePopupSystem } from "@/components/popup-system";
import { useLocation } from "wouter";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  updateProfileMutation: UseMutationResult<SelectUser, Error, any>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { clearPopupCache } = usePopupSystem();
  const [, navigate] = useLocation();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      // Limpar cache de popups para nova sessão
      clearPopupCache();
      toast({
        title: "Login realizado!",
        description: "Bem-vinda de volta!",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      // Check specific error types
      let title = "Erro no login";
      let description = "Verifique seus dados e tente novamente";

      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        title = "Dados inválidos";
        description = "Email ou senha incorretos. Verifique seus dados.";
      } else if (error.message.includes("Email não encontrado")) {
        title = "Email não encontrado";
        description = "Este email não está cadastrado. Verifique o email digitado.";
      } else if (error.message.includes("Senha incorreta")) {
        title = "Senha incorreta";
        description = "A senha digitada está incorreta. Tente novamente.";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Conta criada!",
        description: "Bem-vinda à Beleza com Luci!",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      let title = "Erro no cadastro";
      let description = "Não foi possível criar sua conta. Tente novamente.";

      if (error.message.includes("already exists") || error.message.includes("Email already exists")) {
        title = "Email já cadastrado";
        description = "Este email já está em uso. Use outro email ou faça login.";
      } else if (error.message.includes("validation") || error.message.includes("senha")) {
        title = "Dados inválidos";
        description = "Verifique se todos os campos estão preenchidos corretamente.";
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      // Limpa o viewMode do localStorage no logout
      localStorage.removeItem('admin_view_mode');
      // Limpar todos os dados relacionados ao usuário
      queryClient.clear();
      // Navegação programática ao invés de reload forçado
      navigate("/auth");
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Sending profile update request:", data);

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      console.log("Profile update response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Profile update error response:", errorText);

        // Try to parse JSON error response
        let errorMessage = "Erro ao atualizar perfil";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If can't parse JSON, use status-based message
          if (response.status === 400) {
            errorMessage = "Dados inválidos. Verifique os campos preenchidos.";
          } else if (response.status === 409) {
            errorMessage = "Este email já está em uso por outro usuário.";
          } else if (response.status === 500) {
            errorMessage = "Erro interno do servidor. Tente novamente.";
          }
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("Profile update successful:", result);
      return result;
    },
    onSuccess: (updatedUser) => {
      console.log("Profile update mutation successful");
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso.",
        variant: "default",
      });
    },
    onError: (error) => {
      console.error("Profile update mutation error:", error);
      toast({
        title: "Erro ao salvar perfil",
        description: error.message || "Não foi possível salvar as informações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        updateProfileMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}