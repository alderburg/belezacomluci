
import { Link } from "wouter";
import { Sparkles, Gift, Heart, Menu, Instagram, Youtube, Music, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Banner } from "@shared/schema";

export default function BioPage() {
  const [isSocialMenuOpen, setIsSocialMenuOpen] = useState(false);

  // Buscar dados do admin (bio e redes sociais)
  const { data: adminProfile } = useQuery<{
    name: string;
    avatar: string;
    bio: string;
    socialNetworks: Array<{
      platform: string;
      username: string;
      url?: string;
    }>;
  }>({
    queryKey: ["/api/admin/public-profile"],
  });

  // Debug: ver os dados retornados
  console.log('Admin Profile:', adminProfile);
  console.log('Social Networks:', adminProfile?.socialNetworks);
  if (adminProfile?.socialNetworks) {
    console.log('Social Networks JSON:', JSON.stringify(adminProfile.socialNetworks, null, 2));
  }

  // Buscar banners da página /bio
  const { data: banners } = useQuery<Banner[]>({
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

  // Função helper para obter o ícone da rede social
  const getSocialIcon = (platform: string) => {
    if (!platform) return <Music className="w-6 h-6 text-white" />;
    
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className="w-6 h-6 text-white" />;
      case 'facebook':
        return <Facebook className="w-6 h-6 text-white" />;
      case 'youtube':
        return <Youtube className="w-6 h-6 text-white" />;
      case 'tiktok':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
        );
      case 'email':
        return (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        );
      default:
        return <Music className="w-6 h-6 text-white" />;
    }
  };

  // Função helper para obter a cor de fundo da rede social
  const getSocialBgColor = (platform: string) => {
    if (!platform) return 'bg-gray-700';
    
    switch (platform.toLowerCase()) {
      case 'instagram':
        return 'bg-gradient-to-br from-pink-500 to-purple-500';
      case 'facebook':
        return 'bg-blue-600';
      case 'youtube':
        return 'bg-red-600';
      case 'tiktok':
        return 'bg-black';
      case 'email':
        return 'bg-gray-700';
      default:
        return 'bg-gray-700';
    }
  };
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#439b1e]/10 via-white to-pink-50 relative overflow-hidden">
      {/* Botão Menu Sanduíche no canto superior direito */}
      <div className="absolute top-6 right-6 z-10">
        <Button 
          onClick={() => setIsSocialMenuOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white shadow-lg w-12 h-12 rounded-lg p-0"
        >
          <Menu className="w-6 h-6" />
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
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-1">
        <div className="max-w-2xl w-full text-center space-y-8">
          
          {/* Logo/Nome */}
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-[#439b1e]/30 rounded-full blur-2xl scale-110"></div>
                <div className="relative w-32 h-32 md:w-40 md:h-40">
                  <img 
                    src="/images/luci-profile.webp" 
                    alt="Luci - Beleza com Luci"
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                </div>
              </div>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#439b1e] via-pink-500 to-purple-500 bg-clip-text text-transparent">
              @belezacomluci
            </h1>
            
            <p className="text-base md:text-lg text-gray-600 max-w-lg mx-auto">
              {adminProfile?.bio || 'Sua dose diária de beleza, perfumaria e autocuidado com muito humor e bom astral! 💚✨'}
            </p>
          </div>

          {/* Banners Empilhados */}
          {banners && banners.length > 0 && (
            <div className="py-8 space-y-6">
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
                    className="w-full h-auto object-cover"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Chamada para Redes Sociais */}
          <div className="py-6">
            <p className="text-base md:text-lg font-medium text-center leading-relaxed text-gray-800">
              Siga <span className="font-bold text-[#439b1e]">@belezacomluci</span> nas redes<br />
              sociais e fique por dentro de tudo!
            </p>
            
            {/* Ícones de Redes Sociais - Dinâmico do banco de dados */}
            {adminProfile?.socialNetworks && adminProfile.socialNetworks.length > 0 && (
              <div className="flex justify-center gap-4 mt-6 flex-wrap">
                {adminProfile.socialNetworks.filter(social => social && social.platform).map((social, index) => (
                  <a
                    key={index}
                    href={social.url || '#'}
                    target={social.url?.startsWith('http') ? "_blank" : undefined}
                    rel={social.url?.startsWith('http') ? "noopener noreferrer" : undefined}
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${getSocialBgColor(social.platform)} hover:scale-110 transition-transform duration-300`}
                  >
                    {getSocialIcon(social.platform)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pt-2">
            <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-gray-300 to-transparent mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">
              Criado com 💚 para minhas cheirosas em 2025
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Menu Social */}
      <Sheet open={isSocialMenuOpen} onOpenChange={setIsSocialMenuOpen}>
        <SheetContent side="right" className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-primary">Minhas Redes</SheetTitle>
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
                {adminProfile.socialNetworks.filter(social => social && social.platform).map((social, index) => (
                  <a
                    key={index}
                    href={social.url || '#'}
                    target={social.url?.startsWith('http') ? "_blank" : undefined}
                    rel={social.url?.startsWith('http') ? "noopener noreferrer" : undefined}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                      social.platform?.toLowerCase() === 'instagram' ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-pink-200/50 hover:bg-pink-500/20' :
                      social.platform?.toLowerCase() === 'facebook' ? 'bg-blue-500/10 border-blue-200/50 hover:bg-blue-500/20' :
                      social.platform?.toLowerCase() === 'youtube' ? 'bg-red-500/10 border-red-200/50 hover:bg-red-500/20' :
                      social.platform?.toLowerCase() === 'tiktok' ? 'bg-black/10 border-gray-200/50 hover:bg-black/20' :
                      social.platform?.toLowerCase() === 'email' ? 'bg-gray-700/10 border-gray-200/50 hover:bg-gray-700/20' :
                      'bg-gray-500/10 border-gray-200/50 hover:bg-gray-500/20'
                    }`}
                  >
                    <div className={`flex items-center justify-center w-12 h-12 ${getSocialBgColor(social.platform)} rounded-lg`}>
                      {getSocialIcon(social.platform)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground capitalize">
                        {social.platform}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {social.username ? `@${social.username}` : 'Siga-nos'}
                      </p>
                    </div>
                  </a>
                ))}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
