import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkBoardCard } from "./LinkBoardCard";
import { AddBoardDialog } from "./AddBoardDialog";
import { Lightbulb, Plus } from "lucide-react";

interface InspirationBoardProps {
  userId: string;
}

export function InspirationBoard({ userId }: InspirationBoardProps) {
  const [boards, setBoards] = useState<any[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, [userId]);

  const fetchBoards = async () => {
    const { data } = await supabase
      .from("link_boards")
      .select("*, link_items(*)")
      .eq("user_id", userId)
      .order("display_order", { ascending: true });

    if (data) {
      setBoards(data);
    }
  };

  const handleBoardAdded = () => {
    fetchBoards();
    setAddDialogOpen(false);
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Inspiration Board
          </CardTitle>
          <Button
            onClick={() => setAddDialogOpen(true)}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Board
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {boards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <LinkBoardCard
                key={board.id}
                board={board}
                onUpdate={fetchBoards}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Create your first inspiration board to save and organize links! 🔗
            </p>
            <Button onClick={() => setAddDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Board
            </Button>
          </div>
        )}
      </CardContent>

      <AddBoardDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        userId={userId}
        onBoardAdded={handleBoardAdded}
      />
    </Card>
  );
}
