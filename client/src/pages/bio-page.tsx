
import { Link } from "wouter";
import { Sparkles, Gift, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BioPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#439b1e]/10 via-white to-pink-50 relative overflow-hidden">
      {/* Botão Portal no canto superior direito */}
      <div className="absolute top-6 right-6 z-10">
        <Link href="/">
          <Button 
            className="bg-pink-500 hover:bg-pink-600 text-white shadow-lg flex items-center gap-2"
          >
            Portal da Luci
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Elementos decorativos de fundo com itens de beleza flutuando */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Efeitos de blur coloridos */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#439b1e]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-pink-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-purple-300/10 rounded-full blur-2xl"></div>
        
        {/* Ícones de beleza flutuantes - tema verde */}
        
        {/* Batom 1 */}
        <svg className="absolute top-[12%] left-[18%] w-10 h-10 text-[#439b1e] animate-float-slow opacity-20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2c-1.1 0-2 .9-2 2v3H8c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2h-2V4c0-1.1-.9-2-2-2zm0 2c.6 0 1 .4 1 1v2h-2V5c0-.6.4-1 1-1zm4 5v11H8V9h8z"/>
        </svg>
        
        {/* Perfume */}
        <svg className="absolute top-[25%] right-[22%] w-12 h-12 text-[#5ab832] animate-float-medium opacity-22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L8 5v2h8V5l-4-4zm-2 6v2h4V7h-4zm-3 3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2H7zm0 2h10v8H7v-8zm2 2v4h6v-4H9z"/>
        </svg>
        
        {/* Espelho de mão */}
        <svg className="absolute top-[58%] left-[12%] w-14 h-14 text-[#357a18] animate-float-slow opacity-18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8.69 2 6 4.69 6 8s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm-1 2v8h2v-8h-2z"/>
        </svg>
        
        {/* Pincel de maquiagem */}
        <svg className="absolute bottom-[32%] right-[18%] w-11 h-11 text-[#439b1e] animate-float-fast opacity-24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.71 4.63l-1.34-1.34c-.39-.39-1.02-.39-1.41 0L9 12.25 11.75 15l8.96-8.96c.39-.39.39-1.02 0-1.41zM7 14c-1.66 0-3 1.34-3 3 0 1.31-1.16 2-2 2 .92 1.22 2.49 2 4 2 2.21 0 4-1.79 4-4 0-1.66-1.34-3-3-3z"/>
        </svg>
        
        {/* Paleta de sombras */}
        <svg className="absolute top-[42%] right-[28%] w-12 h-12 text-[#5ab832] animate-float-medium opacity-20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10c1.38 0 2.5-1.12 2.5-2.5 0-.61-.23-1.21-.64-1.67-.08-.09-.13-.21-.13-.33 0-.28.22-.5.5-.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 8 6.5 8s1.5.67 1.5 1.5S7.33 11 6.5 11zm3-4C8.67 7 8 6.33 8 5.5S8.67 4 9.5 4s1.5.67 1.5 1.5S10.33 7 9.5 7zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 4 14.5 4s1.5.67 1.5 1.5S15.33 7 14.5 7zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 8 17.5 8s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
        
        {/* Esmalte */}
        <svg className="absolute bottom-[22%] left-[28%] w-10 h-10 text-[#439b1e] animate-float-slow opacity-22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.5 2h7c.28 0 .5.22.5.5v3c0 .28-.22.5-.5.5h-7c-.28 0-.5-.22-.5-.5v-3c0-.28.22-.5.5-.5zM7 7h10v1H7V7zm0 2h10c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-9c0-1.1.9-2 2-2zm1 2v9h8v-9H8z"/>
        </svg>
        
        {/* Secador */}
        <svg className="absolute top-[68%] right-[20%] w-13 h-13 text-[#357a18] animate-float-fast opacity-19" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5c0-1.66 1.34-3 3-3h6c1.66 0 3 1.34 3 3v6c0 1.66-1.34 3-3 3h-.17l-2.2 6.6c-.11.33-.42.55-.76.55h-.74c-.34 0-.65-.22-.76-.55L10.17 14H10c-1.66 0-3-1.34-3-3V5zm3-1c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1h-7zm1 3h5v2h-5V7z"/>
        </svg>
        
        {/* Máscara facial */}
        <svg className="absolute top-[38%] left-[8%] w-11 h-11 text-[#5ab832] animate-float-medium opacity-21" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-3.5-9c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm7 0c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zM12 17c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
        </svg>
        
        {/* Sparkles decorativos verdes */}
        <Sparkles className="absolute top-[18%] left-[42%] w-7 h-7 text-[#5ab832] animate-pulse opacity-28" />
        <Sparkles className="absolute bottom-[45%] right-[38%] w-6 h-6 text-[#439b1e] animate-pulse opacity-23" />
        <Sparkles className="absolute top-[78%] left-[35%] w-5 h-5 text-[#357a18] animate-pulse opacity-25" />
        <Heart className="absolute top-[52%] left-[7%] w-8 h-8 text-[#5ab832] animate-pulse opacity-19" />
        <Gift className="absolute bottom-[18%] right-[12%] w-7 h-7 text-[#439b1e] animate-pulse opacity-24" />
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
              Sua dose diária de beleza, perfumaria e autocuidado com muito humor e bom astral! 💚 para minhas cheirosas em 2025 ✨
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-[#439b1e]/20 hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-[#439b1e] to-[#357a18] w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800">Conteúdo Exclusivo</h3>
              <p className="text-sm text-gray-600">Dicas, tutoriais e reviews de beleza e perfumaria</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-pink-300/30 hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800">Autocuidado</h3>
              <p className="text-sm text-gray-600">Tudo sobre cuidados pessoais e bem-estar com pitadas de humor</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-purple-300/30 hover:shadow-xl transition-shadow">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2 text-gray-800">Cupons Exclusivos</h3>
              <p className="text-sm text-gray-600">Descontos especiais nas suas marcas favoritas</p>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-8">
            <p className="text-sm text-gray-500">
              Criado com 💚 para minhas cheirosas em 2025
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
