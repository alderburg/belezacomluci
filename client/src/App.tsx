import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { AdminProvider } from "@/contexts/admin-context";
import { LoginPopupTrigger } from "@/components/login-popup-trigger";
import { PopupSystem } from "@/components/popup-system";
import ResponsiveHomePage from "@/pages/responsive-home-page";
import AuthPage from "@/pages/auth-page";
import ResponsiveVideosPage from "@/pages/responsive-videos-page";
import ResponsiveProductsPage from "@/pages/responsive-products-page";
import ResponsiveCouponsPage from "@/pages/responsive-coupons-page";
import CommunityPage from "@/pages/community-page";
import ProfilePage from "@/pages/profile-page";
import EditProfilePage from "@/pages/edit-profile-page";
import MeuPerfilPage from "@/pages/meu-perfil-page";
import AdminPage from "@/pages/admin-page";
import VideoWatchPage from "@/pages/video-watch-page";
import PlaylistPage from "@/pages/playlist-page";
import CheirosasPage from "@/pages/cheirosas-page";
import AdminCheirosasPage from "@/pages/admin-cheirosas-page";
import NotificationsPage from "@/pages/notifications-page";
import NotificationsMobilePage from "@/pages/notifications-mobile-page";
import NotificationSettingsPage from "@/pages/notification-settings-page";
import NotificationSettingsMobilePage from "@/pages/notification-settings-mobile-page";
import MobileMenuPage from "@/pages/mobile-menu-page";
import SecurityMobilePage from "@/pages/security-mobile-page";
import SecurityPage from "@/pages/security-page";
import NotFound from "@/pages/not-found";
import HomeMobilePage from "@/pages/home-mobile-page"; // Import the new page
import VideosExclusivosMobilePage from "@/pages/videos-exclusivos-mobile-page";
import ProdutosDigitaisMobilePage from "@/pages/produtos-digitais-mobile-page";
import CuponsMobilePage from "@/pages/cupons-mobile-page";
import VideoMobilePage from "@/pages/video-mobile-page"; // Import the new mobile video page
import PlaylistMobilePage from "@/pages/playlist-mobile-page"; // Import the new mobile playlist page
import ProfileMobilePage from "@/pages/profile-mobile-page"; // Import the new mobile profile page
import MeuPerfilMobilePage from "@/pages/meuperfil-mobile-page"; // Import the new mobile edit profile page
import ComunidadeMobilePage from "@/pages/comunidade-mobile-page"; // Import the new mobile community page
import AjudaMobilePage from "@/pages/ajuda-mobile-page"; // Import the new mobile help page
import BioPage from "@/pages/bio-page"; // Import the bio page
import AdminMobilePage from "@/pages/admin-mobile-page"; // Import the admin mobile page
import AdminVideosMobilePage from "@/pages/admin-videos-mobile-page";
import AdminProductsMobilePage from "@/pages/admin-products-mobile-page";
import AdminCouponsMobilePage from "@/pages/admin-coupons-mobile-page";
import AdminBannersMobilePage from "@/pages/admin-banners-mobile-page";
import AdminPopupsMobilePage from "@/pages/admin-popups-mobile-page";
import AdminNotificationsMobilePage from "@/pages/admin-notifications-mobile-page";
import AdminCategoriesMobilePage from "@/pages/admin-categories-mobile-page";
import AdminUsersMobilePage from "@/pages/admin-users-mobile-page";


import { useNotificationsWebSocket } from './hooks/use-notifications-websocket';
import { useDataSync } from './hooks/use-data-sync';
import { MobileDetectionProvider, useMobileDetection } from '@/contexts/mobile-detection-context';

function Router() {
  const { isMobile } = useMobileDetection();

  return (
    <Switch>
      <Route path="/home">
        <Redirect to="/" />
      </Route>
      <ProtectedRoute path="/" component={ResponsiveHomePage} />
      <ProtectedRoute path="/videos" component={ResponsiveVideosPage} />
      <ProtectedRoute path="/videos/video/:id" component={isMobile ? VideoMobilePage : VideoWatchPage} />
      <ProtectedRoute path="/videos/playlist/:id" component={isMobile ? PlaylistMobilePage : PlaylistPage} />
      <ProtectedRoute path="/produtos" component={ResponsiveProductsPage} />
      <ProtectedRoute path="/produtos/video/:id" component={isMobile ? VideoMobilePage : VideoWatchPage} />
      <ProtectedRoute path="/produtos/playlist/:id" component={isMobile ? PlaylistMobilePage : PlaylistPage} />
      {/* Rotas antigas para compatibilidade */}
      <ProtectedRoute path="/video/:id" component={isMobile ? VideoMobilePage : VideoWatchPage} />
      <ProtectedRoute path="/playlist/:id" component={isMobile ? PlaylistMobilePage : PlaylistPage} />
      <ProtectedRoute path="/cupons" component={ResponsiveCouponsPage} />
      <ProtectedRoute path="/comunidade" component={isMobile ? ComunidadeMobilePage : CommunityPage} />
      <ProtectedRoute path="/perfil" component={isMobile ? ProfileMobilePage : ProfilePage} />
      <ProtectedRoute path="/meuperfil" component={isMobile ? MeuPerfilMobilePage : MeuPerfilPage} />
      <ProtectedRoute path="/cheirosas" component={CheirosasPage} />
      <ProtectedRoute path="/notificacoes" component={isMobile ? NotificationsMobilePage : NotificationsPage} />
      <ProtectedRoute path="/configuracoes-notificacoes" component={isMobile ? NotificationSettingsMobilePage : NotificationSettingsPage} />
      <ProtectedRoute path="/seguranca" component={isMobile ? SecurityMobilePage : SecurityPage} />
      <ProtectedRoute path="/ajuda" component={AjudaMobilePage} />
      <ProtectedRoute path="/mobile-menu" component={MobileMenuPage} />
      <ProtectedRoute path="/admin" component={isMobile ? AdminMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/videos" component={isMobile ? AdminVideosMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/products" component={isMobile ? AdminProductsMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/coupons" component={isMobile ? AdminCouponsMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/banners" component={isMobile ? AdminBannersMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/popups" component={isMobile ? AdminPopupsMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/notifications" component={isMobile ? AdminNotificationsMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/categories" component={isMobile ? AdminCategoriesMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/users" component={isMobile ? AdminUsersMobilePage : AdminPage} />
      <ProtectedRoute path="/admin/cheirosas" component={AdminCheirosasPage} />
      <Route path="/bio" component={BioPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Componente interno que tem acesso ao QueryClient
function AppContent() {
  // Ativar sincronização de dados em tempo real globalmente
  useDataSync();

  return (
    <MobileDetectionProvider>
      <AuthProvider>
        <AdminProvider>
          <SidebarProvider>
            <TooltipProvider>
              <Router />
              <LoginPopupTrigger />
              {/* PopupSystem global para popups agendados */}
              <PopupSystem trigger="scheduled" />
              <Toaster />
            </TooltipProvider>
          </SidebarProvider>
        </AdminProvider>
      </AuthProvider>
    </MobileDetectionProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;