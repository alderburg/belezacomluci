import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Star, Sparkles, ArrowRight } from "lucide-react";

interface PremiumUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType?: 'video' | 'product' | 'coupon';
  contentTitle?: string;
}

export function PremiumUpgradeModal({ 
  open, 
  onOpenChange, 
  contentType = 'video',
  contentTitle 
}: PremiumUpgradeModalProps) {
  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'video':
        return 'vídeo';
      case 'product':
        return 'produto';
      case 'coupon':
        return 'cupom';
      default:
        return 'conteúdo';
    }
  };

  const benefits = [
    "Acesso ilimitado a todos os vídeos exclusivos",
    "Download de todos os produtos digitais",
    "Cupons de desconto exclusivos",
    "Conteúdo premium em primeira mão",
    "Suporte prioritário"
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="mx-auto w-[calc(100vw-32px)] sm:max-w-md rounded-2xl p-3 sm:p-4 max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Conteúdo Premium
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground text-sm px-2">
            {contentTitle ? (
              <>
                Este {getContentTypeLabel()}{" "}
                <span className="font-medium">{contentTitle}</span> é exclusivo para
                membros Premium.
              </>
            ) : (
              <>Este {getContentTypeLabel()} é exclusivo para membros Premium.</>
            )}
          </DialogDescription>
        </DialogHeader>


        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
          <CardContent className="p-4">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <h3 className="text-base font-semibold text-purple-900">
                  Torne-se Premium
                </h3>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-xs text-purple-700 mb-4 px-2">
                Desbloqueie todo o conteúdo exclusivo e tenha acesso completo!
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Star className="w-2.5 h-2.5 text-white" fill="white" />
                  </div>
                  <span className="text-xs text-purple-900 leading-tight">{benefit}</span>
                </div>
              ))}
            </div>

            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2.5 text-sm"
              onClick={() => {
                // Aqui você pode implementar a navegação para página de assinatura
                // ou abrir link externo para compra
                window.open('https://pay.hotmart.com/sua-assinatura-premium', '_blank');
                onOpenChange(false);
              }}
            >
              <Crown className="w-4 h-4 mr-2" />
              Assinar Premium
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-2">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground"
          >
            Continuar explorando conteúdo gratuito
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}