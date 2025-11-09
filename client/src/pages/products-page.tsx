import Sidebar from "@/components/sidebar";
import ProductCard from "@/components/product-card";
import BannerCarousel from "@/components/banner-carousel";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { MainContent } from "@/components/main-content";
import { PopupSystem } from "@/components/popup-system";

export default function ProductsPage() {
  const isMobile = useIsMobile();
  const [type, setType] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: banners } = useQuery<any[]>({
    queryKey: ["/api/banners"],
  });

  // Verificar se há banners ativos na página products
  const activeBanners = banners?.filter((banner: any) => banner.isActive && banner.page === "products") || [];
  const hasActiveBanners = activeBanners.length > 0;

  const { data: products, isLoading, error } = useQuery<Product[]>({
    queryKey: ["/api/produtos"],
  });

  const { data: categories } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const filteredProducts = products?.filter((product) => {
    // Filtrar apenas produtos ativos
    const isActive = product.isActive;
    
    // Lógica de filtro por tipo - "course" agora inclui course_video e course_playlist
    let matchesType = !type || type === "all";
    if (!matchesType && type === "course") {
      matchesType = product.type === "course" || product.type === "course_video" || product.type === "course_playlist";
    } else if (!matchesType) {
      matchesType = product.type === type;
    }
    
    const matchesCategory = !category || category === "all" || product.categoryId === category;
    const matchesSearch = !searchTerm ||
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());

    return isActive && matchesType && matchesCategory && matchesSearch;
  }) || [];

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className={`flex-1 transition-all duration-300 ${isMobile ? 'ml-0' : ''}`}>
        <BannerCarousel page="products" />
        <PopupSystem trigger="page_specific" targetPage="products" />
        <div className={`container mx-auto px-6 py-8 ${!hasActiveBanners ? (isMobile ? 'pt-32' : 'pt-24') : ''}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
            <h2 className="text-3xl font-bold text-foreground">Produtos Digitais</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-product-type">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="ebook">E-books</SelectItem>
                  <SelectItem value="course">Cursos</SelectItem>
                  <SelectItem value="pdf">PDFs</SelectItem>
                  <SelectItem value="checklist">Checklists</SelectItem>
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-product-category">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories?.filter(cat => cat.isActive).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                  data-testid="input-search-products"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="uniform-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="h-32 w-full rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="uniform-grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm || type || category ?
                  "Nenhum produto encontrado com os filtros aplicados" :
                  "Nenhum produto disponível no momento"
                }
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}