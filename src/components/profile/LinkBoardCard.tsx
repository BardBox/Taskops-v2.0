import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink, Plus, Trash2 } from "lucide-react";
import { AddLinkDialog } from "./AddLinkDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LinkBoardCardProps {
  board: any;
  onUpdate: () => void;
}

export function LinkBoardCard({ board, onUpdate }: LinkBoardCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [addLinkOpen, setAddLinkOpen] = useState(false);

  const handleDeleteBoard = async () => {
    const { error } = await supabase
      .from("link_boards")
      .delete()
      .eq("id", board.id);

    if (error) {
      toast.error("Failed to delete board");
      return;
    }

    toast.success("Board deleted");
    onUpdate();
  };

  const handleDeleteLink = async (linkId: string) => {
    const { error } = await supabase
      .from("link_items")
      .delete()
      .eq("id", linkId);

    if (error) {
      toast.error("Failed to delete link");
      return;
    }

    toast.success("Link deleted");
    onUpdate();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{board.icon}</span>
              <div>
                <h3 className="font-semibold">{board.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {board.link_items?.length || 0} links
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAddLinkOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDeleteBoard}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {board.link_items && board.link_items.length > 0 ? (
              <div className="space-y-2">
                {board.link_items.map((link: any) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:text-primary flex items-center gap-2 truncate"
                      >
                        {link.title}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                      {link.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {link.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={() => handleDeleteLink(link.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No links yet
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <AddLinkDialog
        open={addLinkOpen}
        onOpenChange={setAddLinkOpen}
        boardId={board.id}
        onLinkAdded={onUpdate}
      />
    </Card>
  );
}
