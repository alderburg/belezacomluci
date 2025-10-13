import React, { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EnhancedCarouselProps {
  children: React.ReactNode[]
  className?: string
  showArrows?: boolean
  minItemsForArrows?: number
  gap?: string
  itemWidth?: string
}

export default function EnhancedCarousel({ 
  children, 
  className = "", 
  showArrows = true,
  minItemsForArrows = 4,
  gap = "gap-6",
  itemWidth = "w-[350px]"
}: EnhancedCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    dragFree: true,
    containScroll: 'trimSnaps',
    slidesToScroll: 1
  })

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true)
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true)
  const [canUseArrows, setCanUseArrows] = useState(false)

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  const onSelect = useCallback(() => {
    if (!emblaApi) return

    setPrevBtnDisabled(!emblaApi.canScrollPrev())
    setNextBtnDisabled(!emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return

    // Verifica se deve mostrar as setas baseado no número de itens
    const slideCount = emblaApi.slideNodes().length
    const shouldShowArrows = showArrows && slideCount >= minItemsForArrows
    setCanUseArrows(shouldShowArrows)

    onSelect()
    emblaApi.on('reInit', onSelect)
    emblaApi.on('select', onSelect)

    return () => {
      emblaApi.off('reInit', onSelect)
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect, showArrows, minItemsForArrows])

  // Também verifica quando o número de children muda
  useEffect(() => {
    if (!emblaApi) return

    const validChildren = React.Children.toArray(children).filter(Boolean)
    const childrenCount = validChildren.length
    const shouldShowArrows = showArrows && childrenCount >= minItemsForArrows
    setCanUseArrows(shouldShowArrows)
  }, [children, showArrows, minItemsForArrows, emblaApi])

  return (
    <div className={cn("relative", className)}>
      {/* Seta esquerda */}
      {canUseArrows && (
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "absolute -left-6 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background shadow-lg",
            "transition-opacity duration-200",
            prevBtnDisabled ? "opacity-30 cursor-not-allowed" : "opacity-90 hover:opacity-100"
          )}
          onClick={scrollPrev}
          disabled={prevBtnDisabled}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Container do carrossel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className={`flex ${gap}`}>
          {React.Children.toArray(children).filter(Boolean).map((child, index) => (
            <div key={index} className={`flex-shrink-0 ${itemWidth}`}>
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Seta direita */}
      {canUseArrows && (
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "absolute -right-6 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background shadow-lg",
            "transition-opacity duration-200",
            nextBtnDisabled ? "opacity-30 cursor-not-allowed" : "opacity-90 hover:opacity-100"
          )}
          onClick={scrollNext}
          disabled={nextBtnDisabled}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}