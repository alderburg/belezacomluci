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
        
        {/* Ícones decorativos sutis */}
        {/* Pente 1 */}
        <svg className="absolute top-[15%] left-[12%] w-8 h-8 text-[#439b1e] opacity-15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h2v18H3V3zm4 0h2v18H7V3zm4 0h2v18h-2V3zm4 0h2v18h-2V3zm4 0h2v18h-2V3z"/>
        </svg>
        
        {/* Escova */}
        <svg className="absolute top-[60%] right-[15%] w-9 h-9 text-pink-400 opacity-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 8h-3V4H3v4H0v2h3v4h14v-4h3V8zm-5 4H5V6h10v6z"/>
          <rect x="7" y="8" width="2" height="3"/>
          <rect x="11" y="8" width="2" height="3"/>
        </svg>
        
        {/* Caixa de Presente 1 */}
        <svg className="absolute top-[35%] left-[8%] w-9 h-9 text-purple-400 opacity-14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/>
        </svg>
        
        {/* Coração 1 */}
        <Heart className="absolute bottom-[25%] left-[18%] w-7 h-7 text-pink-500 opacity-13" />
        
        {/* Pente 2 */}
        <svg className="absolute bottom-[40%] right-[25%] w-7 h-7 text-[#5ab832] opacity-16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h2v18H3V3zm4 0h2v18H7V3zm4 0h2v18h-2V3zm4 0h2v18h-2V3zm4 0h2v18h-2V3z"/>
        </svg>
        
        {/* Caixa de Presente 2 */}
        <Gift className="absolute top-[70%] left-[32%] w-8 h-8 text-purple-500 opacity-11" />
        
        {/* Coração 2 */}
        <Heart className="absolute top-[25%] right-[20%] w-6 h-6 text-pink-400 opacity-15" />
        
        {/* Sparkles decorativos */}
        <Sparkles className="absolute top-[45%] left-[5%] w-6 h-6 text-[#439b1e] opacity-18" />
        <Sparkles className="absolute bottom-[15%] right-[10%] w-5 h-5 text-pink-400 opacity-16" />
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
              Criado com 💚
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}