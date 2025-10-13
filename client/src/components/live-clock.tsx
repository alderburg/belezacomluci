import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="flex items-center space-x-2 bg-gradient-to-r from-primary/10 to-accent/10 px-4 py-2 rounded-xl border border-primary/20 shadow-sm">
      <Clock className="w-4 h-4 text-primary animate-pulse" />
      <div className="flex flex-col">
        <span className="text-sm font-bold text-foreground">
          {currentTime.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
          })}
        </span>
        <span className="text-xs text-muted-foreground">
          {currentTime.toLocaleDateString('pt-BR', { 
            weekday: 'short',
            day: '2-digit', 
            month: 'short' 
          })}
        </span>
      </div>
    </div>
  );
}