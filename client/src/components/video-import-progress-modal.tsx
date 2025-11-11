import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface VideoImportProgressModalProps {
  open: boolean;
  totalVideos: number;
  currentVideoIndex: number;
  currentVideoTitle: string;
  currentVideoThumbnail: string;
  importedCount: number;
  failedCount: number;
  onCancel: () => void;
  isCancelling: boolean;
}

export function VideoImportProgressModal({
  open,
  totalVideos,
  currentVideoIndex,
  currentVideoTitle,
  currentVideoThumbnail,
  importedCount,
  failedCount,
  onCancel,
  isCancelling
}: VideoImportProgressModalProps) {
  const progress = totalVideos > 0 ? (currentVideoIndex / totalVideos) * 100 : 0;
  const remaining = totalVideos - currentVideoIndex;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[600px] w-[calc(100%-2rem)] mx-auto rounded-lg" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        hideCloseButton
      >
        <DialogHeader>
          <DialogTitle>Importando Vídeos do YouTube</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Progresso: {currentVideoIndex} de {totalVideos}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="flex gap-3 p-4 rounded-md border bg-card">
            <img
              src={currentVideoThumbnail}
              alt={currentVideoTitle}
              className="w-32 h-20 rounded-md object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-sm font-medium line-clamp-2">
                {currentVideoTitle || "Preparando..."}
              </p>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  Importando vídeo...
                </span>
              </div>
            </div>
          </div>

          {failedCount > 0 && (
            <div className="flex flex-col items-center gap-2 p-4 rounded-md bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
              <div className="text-center">
                <div className="text-lg font-semibold">{failedCount}</div>
                <div className="text-xs text-muted-foreground">Vídeos com falha</div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isCancelling}
              data-testid="button-cancel-import"
              className="w-full"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Cancelar Importação"
              )}
            </Button>
          </div>

          {isCancelling && (
            <p className="text-xs text-center text-muted-foreground">
              Aguarde... Finalizando o vídeo atual antes de cancelar
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
