
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

export default function BioPage() {
  const [isSocialMenuOpen, setIsSocialMenuOpen] = useState(false);
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
              Sua dose diária de beleza, perfumaria e autocuidado com muito humor e bom astral! 💚✨
            </p>
          </div>

          {/* Banners Empilhados */}
          <div className="py-8 space-y-6">
            {/* Banner 1 - GIF Animado */}
            <a 
              href="/auth"
              className="block w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <img 
                src="https://www.belezacomluci.com.br/wp-content/uploads/2025/03/Banners-BLZ-com-Luciii.gif" 
                alt="Banner Cabelo de Princesa"
                className="w-full h-auto object-cover"
              />
            </a>

            {/* Banner 2 - Cupons */}
            <a 
              href="/auth"
              className="block w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <img 
                src="https://www.belezacomluci.com.br/wp-content/uploads/2024/11/3-1_11zon.webp" 
                alt="Banner Melhores Cupons"
                className="w-full h-auto object-cover"
              />
            </a>

            {/* Banner 3 - Shopee */}
            <a 
              href="/auth"
              className="block w-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
            >
              <img 
                src="https://www.belezacomluci.com.br/wp-content/uploads/2024/12/shopee-banner.png" 
                alt="Banner Shopee"
                className="w-full h-auto object-cover"
              />
            </a>
          </div>

          {/* Chamada para Redes Sociais */}
          <div className="py-6">
            <p className="text-base md:text-lg font-medium text-center leading-relaxed text-gray-800">
              Siga <span className="font-bold text-[#439b1e]">@belezacomluci</span> nas redes<br />
              sociais e fique por dentro de tudo!
            </p>
            
            {/* Ícones de Redes Sociais */}
            <div className="flex justify-center gap-4 mt-6">
              <a
                href="https://www.tiktok.com/@belezacomluci"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-300"
              >
                <svg className="w-10 h-10 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>
                </svg>
              </a>
              
              <a
                href="https://www.instagram.com/belezacomluci"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform duration-300"
              >
                <svg className="w-10 h-10 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              
              <a
                href="mailto:contato@belezacomluci.com.br"
                className="hover:scale-110 transition-transform duration-300"
              >
                <svg className="w-10 h-10 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </a>
            </div>
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
              <a
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
              </a>
            </Link>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/belezacomluci"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl border border-pink-200/50 hover:bg-pink-500/20 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-lg">
                <Instagram className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">Instagram</h3>
                <p className="text-sm text-muted-foreground">@belezacomluci</p>
              </div>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/belezacomluci"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-blue-500/10 rounded-xl border border-blue-200/50 hover:bg-blue-500/20 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
                <Facebook className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">Facebook</h3>
                <p className="text-sm text-muted-foreground">Curta nossa página</p>
              </div>
            </a>

            {/* YouTube */}
            <a
              href="https://www.youtube.com/@belezacomluci"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-red-500/10 rounded-xl border border-red-200/50 hover:bg-red-500/20 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-red-600 rounded-lg">
                <Youtube className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">YouTube</h3>
                <p className="text-sm text-muted-foreground">Vídeos e tutoriais</p>
              </div>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@belezacomluci"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-black/10 rounded-xl border border-gray-200/50 hover:bg-black/20 transition-colors"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-black rounded-lg">
                <Music className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">TikTok</h3>
                <p className="text-sm text-muted-foreground">Conteúdo rápido e divertido</p>
              </div>
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
