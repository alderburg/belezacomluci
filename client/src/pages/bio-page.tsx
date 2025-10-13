
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
        <div className="absolute top-[35%] left-[5%] animate-float-medium opacity-18">
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
