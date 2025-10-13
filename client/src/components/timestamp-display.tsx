import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Calendar } from 'lucide-react';

interface TimestampDisplayProps {
  date: string | Date;
  showFullDate?: boolean;
  variant?: 'default' | 'prominent' | 'compact';
}

export default function TimestampDisplay({ 
  date, 
  showFullDate = false, 
  variant = 'default' 
}: TimestampDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Atualiza a cada 30 segundos

    return () => clearInterval(timer);
  }, []);

  const formatTimeAgo = (date: string | Date) => {
    return formatDistanceToNow(new Date(date), { 
      locale: ptBR, 
      addSuffix: true 
    });
  };

  const formatFullDate = (date: string | Date) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (variant === 'prominent') {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg px-3 py-2 border border-primary/20">
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {formatTimeAgo(date)}
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-1 text-xs bg-muted/50 px-2 py-1 rounded-full border">
        <Clock className="w-3 h-3" />
        <span className="font-medium">{formatTimeAgo(date)}</span>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex items-center space-x-1 text-xs font-medium text-foreground bg-muted/50 px-2 py-1 rounded-full border">
      <Clock className="w-3 h-3 text-primary" />
      <span>{formatTimeAgo(date)}</span>
    </div>
  );
}