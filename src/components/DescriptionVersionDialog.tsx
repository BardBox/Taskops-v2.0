import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState } from "react";
import { FileText, X } from "lucide-react";

interface HistoryEntry {
  id: string;
  edited_at: string;
  edited_by_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  version_snapshot: string | null;
  change_description: string | null;
  editor: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

interface DescriptionVersionDialogProps {
  version: HistoryEntry;
  allVersions: HistoryEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DescriptionVersionDialog = ({
  version,
  allVersions,
  open,
  onOpenChange,
}: DescriptionVersionDialogProps) => {
  const [compareWith, setCompareWith] = useState<string | null>(null);

  const currentVersionIndex = allVersions.findIndex(v => v.id === version.id);
  const currentVersionNumber = allVersions.length - currentVersionIndex;

  const compareVersion = compareWith 
    ? allVersions.find(v => v.id === compareWith)
    : null;

  const highlightDifferences = (text1: string, text2: string) => {
    const words1 = text1.split(/(\s+)/);
    const words2 = text2.split(/(\s+)/);
    
    const maxLength = Math.max(words1.length, words2.length);
    const result: JSX.Element[] = [];

    for (let i = 0; i < maxLength; i++) {
      const word1 = words1[i] || '';
      const word2 = words2[i] || '';

      if (word1 !== word2) {
        if (word1) {
          result.push(
            <span key={`old-${i}`} className="bg-red-500/20 text-red-700 dark:text-red-300 px-1 rounded">
              {word1}
            </span>
          );
        }
        if (word2) {
          result.push(
            <span key={`new-${i}`} className="bg-green-500/20 text-green-700 dark:text-green-300 px-1 rounded">
              {word2}
            </span>
          );
        }
      } else {
        result.push(<span key={i}>{word1}</span>);
      }
    }

    return result;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <DialogTitle>Description Version #{currentVersionNumber}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Version Info */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div>
                <div className="font-medium text-sm">{version.editor.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(version.edited_at), 'MMMM d, yyyy h:mm a')}
                </div>
              </div>
              <Badge variant="outline">
                {version.editor.role === 'project_owner' ? 'PO' : 
                 version.editor.role === 'project_manager' ? 'PM' : 'TM'}
              </Badge>
            </div>
          </div>

          {/* Compare Selector */}
          {allVersions.length > 1 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Compare with:</label>
              <Select value={compareWith || 'none'} onValueChange={(value) => setCompareWith(value === 'none' ? null : value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No comparison</SelectItem>
                  {allVersions
                    .filter(v => v.id !== version.id)
                    .map((v, index) => (
                      <SelectItem key={v.id} value={v.id}>
                        Version #{allVersions.length - index} - {format(new Date(v.edited_at), 'MMM d, h:mm a')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Content Display */}
          <ScrollArea className="h-[400px]">
            {compareVersion ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Old Version */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Badge variant="outline" className="bg-red-500/10 text-red-500">
                      Version #{allVersions.length - allVersions.findIndex(v => v.id === compareVersion.id)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(compareVersion.edited_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-muted/30">
                    <p className="whitespace-pre-wrap">{compareVersion.version_snapshot || compareVersion.new_value}</p>
                  </div>
                </div>

                {/* New Version */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      Version #{currentVersionNumber}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(version.edited_at), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg bg-muted/30">
                    <p className="whitespace-pre-wrap">{version.version_snapshot || version.new_value}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none p-6 rounded-lg bg-muted/30">
                <p className="whitespace-pre-wrap">{version.version_snapshot || version.new_value}</p>
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
