import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile, Heart, Camera, Sparkles } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EMOJI_CATEGORIES = {
  faces: {
    name: 'Rostos',
    icon: Smile,
    emojis: ['😊', '😍', '🥰', '😘', '🤩', '😎', '🥳', '😇', '🤗', '🙃', '😉', '😋', '😝', '🤪', '🤭', '🤔', '🤫', '🤐', '😴', '😴']
  },
  beauty: {
    name: 'Beleza',
    icon: Sparkles,
    emojis: ['💄', '💋', '👄', '💅', '💆‍♀️', '💇‍♀️', '🧴', '🪞', '✨', '💎', '🌟', '⭐', '🎀', '🌸', '🌺', '🌹', '💐', '🌷', '🦋', '👑']
  },
  hearts: {
    name: 'Corações',
    icon: Heart,
    emojis: ['❤️', '💕', '💖', '💗', '💓', '💞', '💘', '💝', '🧡', '💛', '💚', '💙', '💜', '🤍', '🖤', '🤎', '❣️', '💔', '❤️‍🔥', '❤️‍🩹']
  },
  objects: {
    name: 'Objetos',
    icon: Camera,
    emojis: ['📸', '🎬', '🎭', '🎨', '🖌️', '🎪', '🎊', '🎉', '🎁', '🎂', '🍰', '🧁', '🍭', '🍫', '🍯', '☕', '🥂', '🍾', '🎵', '🎶']
  }
};

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('beauty');
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground hover:bg-accent/50 p-2"
        >
          <Smile className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="border-b border-border">
          <div className="flex">
            {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`flex-1 p-3 text-center hover:bg-accent/50 transition-colors ${
                    activeCategory === key ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <IconComponent className="w-4 h-4 mx-auto" />
                  <div className="text-xs mt-1">{category.name}</div>
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="p-3 h-48 overflow-y-auto">
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-accent/50 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}