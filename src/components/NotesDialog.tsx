import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

interface NotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: string | null;
  referenceLink1: string | null;
  referenceLink2: string | null;
  referenceLink3: string | null;
  taskName: string;
}

export const NotesDialog = ({
  open,
  onOpenChange,
  notes,
  referenceLink1,
  referenceLink2,
  referenceLink3,
  taskName,
}: NotesDialogProps) => {
  const hasReferenceLinks = referenceLink1 || referenceLink2 || referenceLink3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{taskName}</DialogTitle>
          <DialogDescription>Task details and reference links</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {notes && (
            <div>
              <h4 className="text-sm font-medium mb-2">Notes</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
            </div>
          )}

          {hasReferenceLinks && (
            <div>
              <h4 className="text-sm font-medium mb-2">Reference Links</h4>
              <div className="space-y-2">
                {referenceLink1 && (
                  <a
                    href={referenceLink1}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Reference Link 1
                  </a>
                )}
                {referenceLink2 && (
                  <a
                    href={referenceLink2}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Reference Link 2
                  </a>
                )}
                {referenceLink3 && (
                  <a
                    href={referenceLink3}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Reference Link 3
                  </a>
                )}
              </div>
            </div>
          )}

          {!notes && !hasReferenceLinks && (
            <p className="text-sm text-muted-foreground">No notes or reference links available</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
