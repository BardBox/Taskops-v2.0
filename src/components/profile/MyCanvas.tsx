import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, Plus, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ShowcaseImage {
  id: string;
  image_url: string;
  caption: string | null;
  display_order: number;
}

interface MyCanvasProps {
  userId: string;
}

export function MyCanvas({ userId }: MyCanvasProps) {
  const [images, setImages] = useState<ShowcaseImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchImages();
  }, [userId]);

  const fetchImages = async () => {
    const { data } = await supabase
      .from("showcase_images")
      .select("*")
      .eq("user_id", userId)
      .order("display_order", { ascending: true });

    if (data) {
      setImages(data);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (images.length >= 5) {
      toast({
        title: "Maximum reached",
        description: "You can only showcase up to 5 images",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("showcase-images")
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("showcase-images")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("showcase_images")
        .insert({
          user_id: userId,
          image_url: publicUrl,
          caption: caption || null,
          display_order: images.length,
        });

      if (insertError) throw insertError;

      toast({
        title: "Image added!",
        description: "Your creative work has been added to your canvas",
      });

      fetchImages();
      setAddDialogOpen(false);
      setSelectedFile(null);
      setCaption("");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    try {
      const fileName = imageUrl.split("/showcase-images/")[1];
      
      await supabase.storage
        .from("showcase-images")
        .remove([fileName]);

      const { error } = await supabase
        .from("showcase_images")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Image removed",
        description: "Image has been removed from your canvas",
      });

      fetchImages();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            My Canvas
            <span className="text-sm text-muted-foreground font-normal">
              ({images.length}/5)
            </span>
          </CardTitle>
          {images.length < 5 && (
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Image
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Your Canvas</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="image-upload">Select Image</Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max file size: 5MB
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="caption">Caption (Optional)</Label>
                    <Input
                      id="caption"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Describe your work..."
                      className="mt-2"
                      maxLength={100}
                    />
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="w-full"
                  >
                    {uploading ? (
                      "Uploading..."
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square overflow-hidden rounded-lg border-2 border-border hover:border-primary transition-all"
              >
                <img
                  src={image.image_url}
                  alt={image.caption || "Showcase image"}
                  className="w-full h-full object-cover"
                />
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-white text-sm truncate">{image.caption}</p>
                  </div>
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                  onClick={() => handleDelete(image.id, image.image_url)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Showcase your creative style! Add 3-5 images of your best work. 🎨
            </p>
            <Button onClick={() => setAddDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Image
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
