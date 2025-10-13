
import { useState, useEffect } from 'react';
import { Clock, Zap, AlertTriangle } from 'lucide-react';
import { toEpochMs } from '@/lib/time';

interface CountdownTimerProps {
  expiryDate: string | Date;
  className?: string;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export default function CountdownTimer({ expiryDate, className = "", compact = false }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiryMs = toEpochMs(expiryDate);
      if (!expiryMs) {
        setIsExpired(true);
        return;
      }
      const difference = expiryMs - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setIsExpired(false);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryDate]);

  // Calcular urgência baseada no tempo restante
  const totalHours = timeLeft.days * 24 + timeLeft.hours;
  const isCritical = totalHours <= 24; // Menos de 24 horas
  const isUrgent = totalHours <= 72 && totalHours > 24; // Entre 24 e 72 horas
  const isWarning = totalHours <= 168 && totalHours > 72; // Entre 3 e 7 dias

  if (isExpired) {
    return (
      <div className={`flex items-center justify-center space-x-2 text-red-500 ${className}`}>
        <AlertTriangle className="w-4 h-4 animate-pulse" />
        <span className="text-sm font-bold">EXPIRADO</span>
      </div>
    );
  }

  const formatTime = (value: number) => value.toString().padStart(2, '0');

  // Modo compacto: mostrar apenas total de horas
  if (compact) {
    const now = Date.now();
    const expiryMs = toEpochMs(expiryDate);
    
    if (!expiryMs) return null;
    
    const difference = expiryMs - now;
    
    // Total de horas restantes
    const totalHoursRaw = difference / (1000 * 60 * 60);
    const totalHoursFloor = Math.floor(totalHoursRaw);
    
    const totalHoursStr = totalHoursFloor.toString().padStart(2, '0');
    const minutesStr = formatTime(timeLeft.minutes);
    const secondsStr = formatTime(timeLeft.seconds);
    
    return (
      <div className={`bg-gradient-to-r from-red-100 via-red-50 to-red-100 border-2 border-red-300 rounded-lg p-3 text-center shadow-lg animate-pulse ${className}`}>
        <div className="text-xs font-bold text-red-700 mb-1 tracking-wide">
          🔥 ÚLTIMAS HORAS!
        </div>
        <div className="text-lg font-bold text-red-800 font-mono">
          {totalHoursStr}:{minutesStr}:{secondsStr}
        </div>
        <div className="text-xs font-bold text-red-700 mt-1 animate-pulse">
          APROVEITE AGORA!
        </div>
      </div>
    );
  }

  // Determinar estilo baseado na urgência
  const getUrgencyStyles = () => {
    if (isCritical) {
      return {
        containerClass: "bg-gradient-to-r from-red-100 via-red-50 to-red-100 border-2 border-red-300 shadow-lg animate-pulse",
        textColor: "text-red-700",
        numberColor: "text-red-800",
        iconColor: "text-red-600",
        icon: Zap,
        urgencyText: "🔥 ÚLTIMAS HORAS!",
        urgencyColor: "text-red-700"
      };
    } else if (isUrgent) {
      return {
        containerClass: "bg-gradient-to-r from-orange-100 via-orange-50 to-orange-100 border-2 border-orange-300 shadow-md",
        textColor: "text-orange-700",
        numberColor: "text-orange-800",
        iconColor: "text-orange-600",
        icon: AlertTriangle,
        urgencyText: "⚠️ OFERTA LIMITADA",
        urgencyColor: "text-orange-700"
      };
    } else if (isWarning) {
      return {
        containerClass: "bg-gradient-to-r from-yellow-100 via-yellow-50 to-yellow-100 border border-yellow-300",
        textColor: "text-yellow-700",
        numberColor: "text-yellow-800",
        iconColor: "text-yellow-600",
        icon: Clock,
        urgencyText: "⏰ OFERTA LIMITADA",
        urgencyColor: "text-yellow-700"
      };
    } else {
      return {
        containerClass: "bg-gradient-to-r from-green-100 via-green-50 to-green-100 border border-green-300",
        textColor: "text-green-700",
        numberColor: "text-green-800",
        iconColor: "text-green-600",
        icon: Clock,
        urgencyText: "✨ OFERTA ESPECIAL",
        urgencyColor: "text-green-700"
      };
    }
  };

  const styles = getUrgencyStyles();
  const IconComponent = styles.icon;

  return (
    <div className={`${styles.containerClass} rounded-lg p-3 ${className}`}>
      {/* Texto de urgência */}
      <div className="text-center mb-2">
        <div className={`text-xs font-bold ${styles.urgencyColor} tracking-wide`}>
          {styles.urgencyText}
        </div>
      </div>

      {/* Contador */}
      <div className="flex items-center justify-center space-x-1">
        <IconComponent className={`w-4 h-4 ${styles.iconColor} ${isCritical ? 'animate-bounce' : ''}`} />
        <div className="flex items-center space-x-1 text-sm font-mono">
          {timeLeft.days > 0 && (
            <>
              <div className="flex flex-col items-center">
                <span className={`text-lg font-bold ${styles.numberColor} ${isCritical ? 'animate-pulse' : ''}`}>
                  {formatTime(timeLeft.days)}
                </span>
                <span className={`text-xs ${styles.textColor}`}>dias</span>
              </div>
              <span className={`${styles.iconColor} font-bold`}>:</span>
            </>
          )}
          <div className="flex flex-col items-center">
            <span className={`text-lg font-bold ${styles.numberColor} ${isCritical ? 'animate-pulse' : ''}`}>
              {formatTime(timeLeft.hours)}
            </span>
            <span className={`text-xs ${styles.textColor}`}>hrs</span>
          </div>
          <span className={`${styles.iconColor} font-bold`}>:</span>
          <div className="flex flex-col items-center">
            <span className={`text-lg font-bold ${styles.numberColor} ${isCritical ? 'animate-pulse' : ''}`}>
              {formatTime(timeLeft.minutes)}
            </span>
            <span className={`text-xs ${styles.textColor}`}>min</span>
          </div>
          <span className={`${styles.iconColor} font-bold`}>:</span>
          <div className="flex flex-col items-center">
            <span className={`text-lg font-bold ${styles.numberColor} ${isCritical ? 'animate-pulse' : ''}`}>
              {formatTime(timeLeft.seconds)}
            </span>
            <span className={`text-xs ${styles.textColor}`}>seg</span>
          </div>
        </div>
      </div>

      {/* Texto adicional de urgência para casos críticos */}
      {isCritical && (
        <div className="text-center mt-2">
          <div className="text-xs font-medium text-red-700 animate-pulse">
            APROVEITE AGORA!
          </div>
        </div>
      )}
    </div>
  );
}
