
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Video {
  id: string;
  title: string;
  type: string;
}

interface Product {
  id: string;
  title: string;
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
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedItem ? selectedItem.title : placeholder || `Selecione um ${type === 'video' ? 'vídeo' : 'curso'}`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={`Buscar ${type === 'video' ? 'vídeo' : 'curso'}...`}
              value={searchTerm}
              onValueChange={setSearchTerm}
            />
            <CommandList>
              <CommandEmpty>Nenhum {type === 'video' ? 'vídeo' : 'curso'} encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      onChange(item.id === value ? null : item.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.type === 'live' ? 'Live' : item.type === 'playlist' ? 'Playlist' : 'Vídeo'}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedItem && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(null);
            setSearchTerm('');
          }}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar seleção
        </Button>
      )}
    </div>
  );
}
