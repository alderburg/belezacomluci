import { ReactNode } from 'react';
import { useSidebar } from '@/contexts/sidebar-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface MainContentProps {
  children: ReactNode;
  className?: string;
}

export function MainContent({ children, className }: MainContentProps) {
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <main 
      className={cn(
        'transition-all duration-300',
        isMobile 
          ? 'pt-32' 
          : isCollapsed 
            ? 'lg:ml-20 pt-16' 
            : 'lg:ml-64 pt-16',
        className
      )}
    >
      {children}
    </main>
  );
}