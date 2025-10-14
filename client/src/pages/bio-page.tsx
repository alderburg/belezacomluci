import { Link } from "wouter";
import { Sparkles, Gift, Heart, Menu, Instagram, Youtube, Music, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Banner } from "@shared/schema";
import { useDataSync } from "@/hooks/use-data-sync";

export default function BioPage() {
  // Ativar sincronização global de dados
  useDataSync();

  const [isSocialMenuOpen, setIsSocialMenuOpen] = useState(false);

  // Buscar dados do admin (bio e redes sociais)
  const { data: adminProfile, isLoading: isLoadingProfile } = useQuery<{
    name: string;
    avatar: string;
    bio: string;
    socialNetworks: Array<{
      type: string;
      url?: string;
    }>;
  }>({
    queryKey: ["/api/admin/public-profile"],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });


  // Buscar banners da página /bio
  const { data: banners, isLoading: isLoadingBanners } = useQuery<Banner[]>({
    queryKey: ["/api/banners"],
    select: (data) => {
      const now = new Date();
      return data
        .filter((banner: Banner) => {
          // Filtrar apenas banners da página 'bio'
          if (banner.page !== 'bio') return false;

          // Filtrar apenas banners ativos
          if (!banner.isActive) return false;

          // Verificar se está dentro do período de exibição (se definido)
          if (banner.startDateTime && new Date(banner.startDateTime) > now) return false;
          if (banner.endDateTime && new Date(banner.endDateTime) < now) return false;

          return true;
        })
        .sort((a: Banner, b: Banner) => (a.order || 0) - (b.order || 0));
    },
  });

  // Verificar se está carregando
  const isLoading = isLoadingProfile || isLoadingBanners;

  // Função helper para obter os dados da rede social (ícone e cor)
  const getSocialData = (platform: string) => {
    if (!platform) {
      return {
        icon: <Music className="w-6 h-6" />,
        bgColor: 'bg-gray-700',
        name: 'Outra'
      };
    }

    switch (platform.toLowerCase()) {
      case 'instagram':
        return {
          icon: <Instagram className="w-6 h-6" />,
          bgColor: 'bg-gradient-to-br from-pink-500 to-purple-500',
          name: 'Instagram'
        };
      case 'facebook':
        return {
          icon: <Facebook className="w-6 h-6" />,
          bgColor: 'bg-blue-600',
          name: 'Facebook'
        };
      case 'youtube':
        return {
          icon: <Youtube className="w-6 h-6" />,
          bgColor: 'bg-red-600',
          name: 'YouTube'
        };
      case 'tiktok':
        return {
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
          ),
          bgColor: 'bg-black',
          name: 'TikTok'
        };
      case 'twitter':
        return {
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          ),
          bgColor: 'bg-black',
          name: 'Twitter/X'
        };
      case 'linkedin':
        return {
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          ),
          bgColor: 'bg-blue-700',
          name: 'LinkedIn'
        };
      case 'whatsapp':
        return {
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
          ),
          bgColor: 'bg-green-500',
          name: 'WhatsApp'
        };
      case 'telegram':
        return {
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
          ),
          bgColor: 'bg-blue-500',
          name: 'Telegram'
        };
      case 'email':
        return {
          icon: (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          ),
          bgColor: 'bg-gray-700',
          name: 'Email'
        };
      default:
        return {
          icon: <Music className="w-6 h-6" />,
          bgColor: 'bg-gray-700',
          name: platform
        };
    }
  };

  // Mostrar preloader enquanto carrega
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#439b1e]/10 via-white to-pink-50">
        <div className="text-center space-y-6">
          {/* Spinner com gradiente */}
          <div className="relative w-8 h-8 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-green-500 rounded-full animate-ping opacity-20"></div>
            <div className="relative w-8 h-8 rounded-full border-2 border-transparent border-t-cyan-400 border-r-teal-500 border-b-green-500 animate-spin"></div>
          </div>

          {/* Texto de carregamento */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-teal-500 to-green-500 bg-clip-text text-transparent">
              Carregando...
            </h2>
            <p className="text-gray-500 text-sm">Preparando sua página</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: '#034738' }}>
      {/* Botão Menu Sanduíche no canto superior direito */}
      <div className="absolute top-6 right-6 z-10">
        <Button 
          onClick={() => setIsSocialMenuOpen(true)}
          className="bg-[#439b1e] hover:bg-[#357a18] text-white shadow-lg w-10 h-10 rounded-lg p-0"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Elementos decorativos de fundo com itens de beleza flutuando */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Efeitos de blur coloridos */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#439b1e]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-pink-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-purple-300/10 rounded-full blur-2xl"></div>

        {/* Itens de beleza flutuantes - tema verde */}
        {/* Secador de cabelo */}
        <div className="absolute top-[10%] left-[15%] animate-float-slow opacity-20">
          <div className="relative">
            <div className="w-16 h-8 bg-gradient-to-br from-[#439b1e] to-[#357a18] rounded-lg shadow-lg relative">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-[#357a18] to-[#2d6615] rounded-full"></div>
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-4 bg-[#2d6615] rounded-sm"></div>
            </div>
            <div className="w-4 h-10 bg-gradient-to-b from-[#2d6615] to-[#1f4a0f] rounded-lg mt-1 mx-auto"></div>
          </div>
        </div>

        {/* Perfume verde */}
        <div className="absolute top-[20%] right-[20%] animate-float-medium opacity-25">
          <div className="relative">
            <div className="w-6 h-6 bg-gradient-to-br from-[#439b1e] to-[#357a18] rounded-sm mb-1"></div>
            <div className="w-10 h-12 bg-gradient-to-br from-[#5ab832] to-[#439b1e] rounded-lg shadow-lg border-2 border-[#357a18]"></div>
          </div>
        </div>

        {/* Pente */}
        <div className="absolute top-[60%] left-[10%] animate-float-slow opacity-15">
          <div className="relative w-20 h-12">
            <div className="w-full h-3 bg-gradient-to-br from-[#439b1e] to-[#357a18] rounded-t-lg shadow-lg"></div>
            <div className="flex gap-1 mt-0.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-2 h-8 bg-gradient-to-b from-[#357a18] to-[#2d6615] rounded-sm"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Escova de cabelo */}
        <div className="absolute bottom-[30%] right-[15%] animate-float-fast opacity-20">
          <div className="relative">
            <div className="w-12 h-16 bg-gradient-to-br from-[#439b1e] to-[#357a18] rounded-3xl shadow-lg relative">
              <div className="absolute inset-2 grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-1 h-3 bg-[#2d6615] rounded-full"></div>
                ))}
              </div>
            </div>
            <div className="w-4 h-8 bg-gradient-to-b from-[#2d6615] to-[#1f4a0f] rounded-lg mt-1 mx-auto"></div>
          </div>
        </div>

        {/* Creme/Hidratante */}
        <div className="absolute top-[40%] right-[30%] animate-float-medium opacity-25">
          <div className="relative">
            <div className="w-4 h-4 bg-gradient-to-br from-[#5ab832] to-[#439b1e] rounded-full mb-1"></div>
            <div className="w-10 h-10 bg-gradient-to-br from-[#439b1e] to-[#357a18] rounded-lg shadow-lg border-2 border-[#2d6615]"></div>
          </div>
        </div>

        {/* Spray/Fixador */}
        <div className="absolute bottom-[20%] left-[25%] animate-float-slow opacity-20">
          <div className="relative">
            <div className="w-5 h-4 bg-gradient-to-br from-[#5ab832] to-[#439b1e] rounded-t-lg mb-0.5"></div>
            <div className="w-8 h-14 bg-gradient-to-br from-[#439b1e] to-[#357a18] rounded-lg shadow-lg border-2 border-[#2d6615]"></div>
          </div>
        </div>

        {/* Batom verde */}
        <div className="absolute top-[70%] right-[25%] animate-float-fast opacity-15">
          <div className="relative">
            <div className="w-8 h-16 bg-gradient-to-b from-[#439b1e] to-[#357a18] rounded-t-full rounded-b-sm shadow-lg"></div>
          </div>
        </div>

        {/* Chapinha/Prancha */}
        <div className="absolute top-[35%] left-[5%] animate-float-medium opacity-20">
          <div className="relative w-6 h-20">
            <div className="w-full h-16 bg-gradient-to-br from-[#439b1e] to-[#357a18] rounded-lg shadow-lg"></div>
            <div className="w-3 h-6 bg-gradient-to-b from-[#2d6615] to-[#1f4a0f] rounded-lg mt-1 mx-auto"></div>
          </div>
        </div>

        {/* Sparkles decorativos verdes */}
        <Sparkles className="absolute top-[15%] left-[40%] w-6 h-6 text-[#5ab832] animate-pulse opacity-30" />
        <Sparkles className="absolute bottom-[40%] right-[40%] w-5 h-5 text-[#439b1e] animate-pulse opacity-25" />
        <Heart className="absolute top-[50%] left-[5%] w-7 h-7 text-[#5ab832] animate-pulse opacity-20" />
        <Gift className="absolute bottom-[15%] right-[10%] w-6 h-6 text-[#439b1e] animate-pulse opacity-25" />
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex items-center justify-center px-6 pt-16 pb-4 md:pt-20 relative z-1">
        <div className="max-w-2xl w-full text-center space-y-6">

          {/* Logo/Nome */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-green-500 rounded-full blur-xl opacity-50 scale-110"></div>
                <div className="relative p-1.5 md:p-2 bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 rounded-full">
                  <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-2xl">
                    <AvatarImage 
                      src={adminProfile?.avatar || "/images/luci-profile.webp"} 
                      alt="Luci - Beleza com Luci"
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-3xl md:text-4xl font-bold">
                      BL
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                  <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white">
              @belezacomluci
            </h1>

            <p className="text-base md:text-lg text-white max-w-lg mx-auto">
              {adminProfile?.bio || 'Sua dose diária de beleza, perfumaria e autocuidado com muito humor e bom astral! 💚✨'}
            </p>
          </div>

          {/* Banners Empilhados */}
          {banners && banners.length > 0 && (
            <div className="pb-8 space-y-6">
              {banners.map((banner) => (
                <a 
                  key={banner.id}
                  href={banner.linkUrl || "#"}
                  target={banner.linkUrl?.startsWith('http') ? "_blank" : undefined}
                  rel={banner.linkUrl?.startsWith('http') ? "noopener noreferrer" : undefined}
                  className="block w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                >
                  <img 
                    src={banner.imageUrl} 
                    alt={banner.title}
                    className="w-full h-auto min-h-[160px] md:min-h-0 object-cover"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Chamada para Redes Sociais */}
          <div className="py-0 pt-4">
            <p className="text-base md:text-lg font-medium text-center leading-relaxed text-white">
              Siga <span className="font-bold text-white">@belezacomluci</span> nas redes<br />
              sociais e fique por dentro de tudo!
            </p>

            {/* Ícones de Redes Sociais - Dinâmico do banco de dados */}
            {adminProfile?.socialNetworks && adminProfile.socialNetworks.length > 0 && (
              <div className="flex justify-center gap-4 mt-3 mb-0 flex-wrap">
                {adminProfile.socialNetworks.filter(social => social && social.type).map((social, index) => {
                  const socialData = getSocialData(social.type);
                  return (
                    <a
                      key={index}
                      href={social.url || '#'}
                      target={social.url?.startsWith('http') ? "_blank" : undefined}
                      rel={social.url?.startsWith('http') ? "noopener noreferrer" : undefined}
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${socialData.bgColor} text-white hover:scale-110 transition-transform duration-300 shadow-lg`}
                      title={socialData.name}
                    >
                      {socialData.icon}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-0 -mt-4">
            <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-4"></div>
            <p className="text-sm text-white/80">
              Criado com 💚 para minhas cheirosas em 2025
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Menu Social */}
      <Sheet open={isSocialMenuOpen} onOpenChange={setIsSocialMenuOpen}>
        <SheetContent side="right" className="w-full [&>button]:!ring-1 [&>button]:!ring-[#439b1e] [&>button]:!ring-offset-1">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-black">Minhas Redes</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Portal da Luci */}
            <Link href="/auth">
              <div
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                onClick={() => setIsSocialMenuOpen(false)}
              >
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground">Portal da Luci</h3>
                  <p className="text-sm text-muted-foreground">Feito para minhas cheirosas</p>
                </div>
              </div>
            </Link>

            {/* Redes Sociais - Dinâmico do banco de dados */}
            {adminProfile?.socialNetworks && adminProfile.socialNetworks.length > 0 && (
              <>
                {adminProfile.socialNetworks.filter(social => social && social.type).map((social, index) => {
                  const socialData = getSocialData(social.type);

                  const description = social.type?.toLowerCase() === 'instagram' ? 'Veja fotos e novidades diárias' :
                    social.type?.toLowerCase() === 'facebook' ? 'Conecte-se e participe da comunidade' :
                    social.type?.toLowerCase() === 'youtube' ? 'Assista tutoriais e dicas exclusivas' :
                    social.type?.toLowerCase() === 'tiktok' ? 'Vídeos curtos e tendências' :
                    social.type?.toLowerCase() === 'twitter' ? 'Acompanhe as novidades em tempo real' :
                    social.type?.toLowerCase() === 'linkedin' ? 'Networking profissional' :
                    social.type?.toLowerCase() === 'whatsapp' ? 'Atendimento direto e personalizado' :
                    social.type?.toLowerCase() === 'telegram' ? 'Mensagens rápidas e grupos' :
                    social.type?.toLowerCase() === 'email' ? 'Entre em contato por email' :
                    'Mais uma forma de conexão';

                  // Formatar URL do email como mailto:
                  const linkUrl = social.type?.toLowerCase() === 'email' 
                    ? `mailto:${social.url}` 
                    : social.url;

                  return (
                    <a
                      key={index}
                      href={linkUrl || '#'}
                      target={social.type?.toLowerCase() !== 'email' && linkUrl?.startsWith('http') ? "_blank" : undefined}
                      rel={social.type?.toLowerCase() !== 'email' && linkUrl?.startsWith('http') ? "noopener noreferrer" : undefined}
                      onClick={() => setIsSocialMenuOpen(false)}
                      className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <div className={`flex items-center justify-center w-12 h-12 ${socialData.bgColor} rounded-lg text-white`}>
                        {socialData.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-foreground">{socialData.name}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                      </div>
                    </a>
                  );
                })}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}