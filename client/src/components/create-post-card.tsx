import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Image, X, Tag, Smile, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import EmojiPicker from './emoji-picker';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { insertPostSchema } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const createPostSchema = insertPostSchema.pick({ content: true, imageUrl: true });

interface CreatePostCardProps {
  onPostCreated?: () => void;
}

export default function CreatePostCard({ onPostCreated }: CreatePostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [taggedUsers, setTaggedUsers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Query para buscar usuários
  const { data: allUsers } = useQuery({
    queryKey: ['/api/users/search'],
    queryFn: async () => {
      const response = await fetch('/api/users/search', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; imageUrl?: string; taggedUserIds?: string[] }) => {
      const response = await apiRequest('POST', '/api/posts', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      setContent('');
      setImageUrl('');
      setTaggedUsers([]);
      setIsExpanded(false);
      onPostCreated?.();
      toast({
        title: 'Sucesso! ✨',
        description: 'Sua postagem foi publicada com amor!',
      });
    },
    onError: () => {
      toast({
        title: 'Ops! 😅',
        description: 'Algo deu errado ao publicar. Tente novamente!',
        variant: 'destructive',
      });
    },
  });

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleEmojiSelect = (emoji: string) => {
    const newContent = content.slice(0, cursorPosition) + emoji + content.slice(cursorPosition);
    setContent(newContent);
    
    // Focus and set cursor position after emoji
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
      }
    }, 0);
  };

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleCancel = () => {
    setContent('');
    setImageUrl('');
    setTaggedUsers([]);
    setIsExpanded(false);
  };

  const handlePublish = () => {
    if (!content.trim()) return;

    createPostMutation.mutate({
      content: content.trim(),
      imageUrl: imageUrl.trim() || undefined,
      taggedUserIds: taggedUsers.map(u => u.id),
    });
  };

  const handleTagUser = (selectedUser: { id: string; name: string; avatar?: string }) => {
    if (!taggedUsers.find(u => u.id === selectedUser.id)) {
      setTaggedUsers([...taggedUsers, selectedUser]);
    }
    setShowTagModal(false);
    setUserSearchTerm('');
  };

  const handleRemoveTag = (userId: string) => {
    setTaggedUsers(taggedUsers.filter(u => u.id !== userId));
  };

  // Filtrar usuários baseado na pesquisa
  const filteredUsers = allUsers?.filter((u: any) => 
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) &&
    !taggedUsers.find(tagged => tagged.id === u.id) &&
    u.id !== user?.id // Não mostrar o próprio usuário
  ) || [];

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Função para verificar se é um link do YouTube
  const isYouTubeVideo = (url: string): boolean => {
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#\?]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];
    
    return youtubePatterns.some(pattern => pattern.test(url));
  };

  // Função para extrair o ID do vídeo do YouTube
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#\?]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        // Remove qualquer parâmetro adicional do ID
        let videoId = match[1];
        if (videoId.includes('?')) {
          videoId = videoId.split('?')[0];
        }
        return videoId;
      }
    }
    return null;
  };

  if (!user?.isAdmin) return null;

  return (
    <Card className="overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-medium">
              {getUserInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-3">
            {/* Textarea Principal */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onFocus={handleFocus}
                onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
                placeholder={`O que você está pensando, ${user.name}? ✨`}
                className={`resize-none border border-border bg-muted/50 rounded-xl transition-all duration-300 ${
                  isExpanded ? 'min-h-[120px]' : 'min-h-[60px]'
                } focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50`}
                data-testid="create-post-textarea"
              />
              
              {/* Contador de caracteres */}
              {isExpanded && (
                <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                  {content.length}/2000
                </div>
              )}
            </div>

            {/* Campo de Imagem - Só aparece quando expandido */}
            {isExpanded && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Adicionar imagem / vídeo</span>
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Cole o link da sua imagem ou vídeo aqui..."
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                  />
                  {imageUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setImageUrl('')}
                      className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-muted"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                {/* Preview da mídia */}
                {imageUrl && (
                  <div className="relative rounded-lg overflow-hidden border">
                    {isYouTubeVideo(imageUrl) ? (
                      <div className="relative">
                        <iframe
                          src={`https://www.youtube.com/embed/${extractYouTubeVideoId(imageUrl)}`}
                          title="Preview do vídeo"
                          className="w-full h-48"
                          frameBorder="0"
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                    ) : (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                        onError={() => setImageUrl('')}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Usuários marcados */}
            {isExpanded && taggedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {taggedUsers.map((taggedUser) => (
                  <Badge
                    key={taggedUser.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={taggedUser.avatar} alt={taggedUser.name} />
                      <AvatarFallback className="text-xs">{getUserInitials(taggedUser.name)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{taggedUser.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTag(taggedUser.id)}
                      className="h-4 w-4 p-0 hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Barra de Ferramentas */}
            {isExpanded && (
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center space-x-1">
                  <EmojiPicker onEmojiSelect={handleEmojiSelect} />
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowTagModal(true)}
                    className="text-muted-foreground hover:text-foreground hover:bg-accent/50 p-2"
                    title="Marcar pessoas"
                  >
                    <Tag className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="hover:bg-muted"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handlePublish}
                    disabled={!content.trim() || createPostMutation.isPending}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-6 transition-all duration-300"
                  >
                    {createPostMutation.isPending ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Publicando...</span>
                      </div>
                    ) : (
                      'Publicar ✨'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sugestões rápidas quando não expandido */}
        {!isExpanded && content.length === 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {['💄 Dica de maquiagem', '✨ Rotina de skincare', '🌸 Produto favorito'].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => {
                  setContent(suggestion + ' ');
                  setIsExpanded(true);
                  setTimeout(() => textareaRef.current?.focus(), 0);
                }}
                className="text-xs h-7 px-3 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </CardContent>

      {/* Modal de seleção de usuários */}
      <Dialog open={showTagModal} onOpenChange={setShowTagModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar pessoas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Campo de pesquisa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Lista de usuários */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u: any) => (
                  <div
                    key={u.id}
                    onClick={() => handleTagUser({ id: u.id, name: u.name, avatar: u.avatar })}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={u.avatar} alt={u.name} />
                      <AvatarFallback>{getUserInitials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{u.name}</p>
                      {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {userSearchTerm ? 'Nenhum usuário encontrado' : 'Digite para buscar usuários'}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}