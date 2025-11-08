
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, X, Video, BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  type: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  coverImageUrl?: string;
  type: string;
}

interface ResourceSearchSelectProps {
  type: 'video' | 'course';
  value?: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
}

export function ResourceSearchSelect({ 
  type, 
  value, 
  onChange, 
  label,
  placeholder,
  required = false 
}: ResourceSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Buscar vídeos
  const { data: videos } = useQuery<Video[]>({
    queryKey: ['/api/videos'],
    enabled: type === 'video',
  });

  // Buscar produtos (cursos) - apenas course_video e course_playlist
  const { data: allProducts } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: type === 'course',
  });

  // Filtrar apenas cursos de vídeo único e playlist
  const products = allProducts?.filter(p => 
    p.type === 'course_video' || p.type === 'course_playlist'
  );

  const items = type === 'video' ? videos : products;
  const selectedItem = items?.find(item => item.id === value);

  const filteredItems = items?.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleSelect = (itemId: string) => {
    onChange(itemId === value ? null : itemId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {/* Mostrar item selecionado */}
      {selectedItem && !isOpen && (
        <div className="relative border border-input rounded-lg p-3 bg-card">
          <div className="flex items-start gap-3">
            {/* Imagem/Thumbnail */}
            <div className="flex-shrink-0">
              {type === 'video' && (selectedItem as Video).thumbnailUrl ? (
                <img 
                  src={(selectedItem as Video).thumbnailUrl} 
                  alt={selectedItem.title}
                  className="w-20 h-12 object-cover rounded"
                />
              ) : type === 'course' && (selectedItem as Product).coverImageUrl ? (
                <img 
                  src={(selectedItem as Product).coverImageUrl} 
                  alt={selectedItem.title}
                  className="w-20 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-20 h-12 bg-muted rounded flex items-center justify-center">
                  {type === 'video' ? (
                    <Video className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <BookOpen className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>

            {/* Informações */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-1">{selectedItem.title}</h4>
              {selectedItem.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {selectedItem.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {type === 'video' 
                    ? ((selectedItem as Video).type === 'live' ? 'Live' : (selectedItem as Video).type === 'playlist' ? 'Playlist' : 'Vídeo')
                    : ((selectedItem as Product).type === 'course_playlist' ? 'Curso Playlist' : 'Curso Vídeo Único')
                  }
                </span>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(true)}
              >
                <ChevronsUpDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Campo de pesquisa quando não há seleção ou está aberto */}
      {(!selectedItem || isOpen) && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="text"
              placeholder={placeholder || `Buscar ${type === 'video' ? 'vídeo' : 'curso'}...`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="pl-10"
            />
          </div>

          {/* Lista de resultados */}
          {isOpen && (
            <div className="border border-input rounded-lg bg-card max-h-80 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhum {type === 'video' ? 'vídeo' : 'curso'} encontrado.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredItems.map((item) => {
                    const isVideo = type === 'video';
                    const imageUrl = isVideo 
                      ? (item as Video).thumbnailUrl 
                      : (item as Product).coverImageUrl;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item.id)}
                        className={cn(
                          "w-full p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left",
                          value === item.id && "bg-muted"
                        )}
                      >
                        {/* Checkbox/Ícone de seleção */}
                        <div className="flex-shrink-0 pt-1">
                          <div className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center",
                            value === item.id ? "bg-primary border-primary" : "border-input"
                          )}>
                            {value === item.id && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Imagem/Thumbnail */}
                        <div className="flex-shrink-0">
                          {imageUrl ? (
                            <img 
                              src={imageUrl} 
                              alt={item.title}
                              className="w-24 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-24 h-16 bg-muted rounded flex items-center justify-center">
                              {isVideo ? (
                                <Video className="h-6 w-6 text-muted-foreground" />
                              ) : (
                                <BookOpen className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {isVideo 
                                ? ((item as Video).type === 'live' ? 'Live' : (item as Video).type === 'playlist' ? 'Playlist' : 'Vídeo')
                                : ((item as Product).type === 'course_playlist' ? 'Curso Playlist' : 'Curso Vídeo Único')
                              }
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Botão para fechar busca quando há seleção */}
          {selectedItem && isOpen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              Cancelar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
