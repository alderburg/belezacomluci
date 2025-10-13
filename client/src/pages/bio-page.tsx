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
            className="bg-[#439b1e] hover:bg-[#357a18] text-white shadow-lg flex items-center gap-2"
          >
            Portal da Luci
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Elementos decorativos */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#439b1e]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-pink-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-purple-300/10 rounded-full blur-2xl"></div>
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
              Criado com 💚 em 2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
