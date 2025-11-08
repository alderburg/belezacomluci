
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Video, BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  };

  const handleSelect = (itemId: string) => {
    onChange(itemId);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleOpenModal = () => {
    setIsOpen(true);
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
      {selectedItem ? (
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

            {/* Botão X apenas */}
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
      ) : (
        /* Campo de pesquisa quando não há seleção */
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            type="text"
            placeholder={placeholder || `Buscar ${type === 'video' ? 'vídeo' : 'curso'}...`}
            value=""
            onFocus={handleOpenModal}
            readOnly
            className="pl-10 cursor-pointer"
          />
        </div>
      )}

      {/* Modal de pesquisa */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>
              Selecionar {type === 'video' ? 'Vídeo' : 'Curso'}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder={placeholder || `Buscar ${type === 'video' ? 'vídeo' : 'curso'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Lista de resultados */}
          <div className="overflow-y-auto max-h-[calc(80vh-180px)]">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
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
                      className="w-full p-4 flex items-start gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      {/* Imagem/Thumbnail */}
                      <div className="flex-shrink-0">
                        {imageUrl ? (
                          <img 
                            src={imageUrl} 
                            alt={item.title}
                            className="w-32 h-20 object-cover rounded"
                          />
                        ) : (
                          <div className="w-32 h-20 bg-muted rounded flex items-center justify-center">
                            {isVideo ? (
                              <Video className="h-8 w-8 text-muted-foreground" />
                            ) : (
                              <BookOpen className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Informações */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
