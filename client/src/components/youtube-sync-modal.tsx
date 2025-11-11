import { Dialog, DialogContent } from "@/components/ui/dialog";
import { YouTubeSyncContent } from "./youtube-sync-content";

export function YouTubeSyncModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <YouTubeSyncContent 
          mode="modal"
          onCancel={onClose}
          onSuccess={onClose}
          initialSync={isOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
