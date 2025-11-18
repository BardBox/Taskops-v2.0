import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, CheckCircle2, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface AvatarFile {
  file: File;
  preview: string;
  name: string;
  category: string;
}

const AVATAR_CATEGORIES = [
  { value: "human", label: "Human" },
  { value: "animal", label: "Animal" },
  { value: "robot", label: "Robot" },
  { value: "fantasy", label: "Fantasy" },
];

export default function AvatarGenerator() {
  const [selectedFiles, setSelectedFiles] = useState<AvatarFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [uploadedAvatars, setUploadedAvatars] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const newAvatarFiles: AvatarFile[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      category: "human", // Default category
    }));

    setSelectedFiles((prev) => [...prev, ...newAvatarFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const updateFileName = (index: number, name: string) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      updated[index].name = name;
      return updated;
    });
  };

  const updateFileCategory = (index: number, category: string) => {
    setSelectedFiles((prev) => {
      const updated = [...prev];
      updated[index].category = category;
      return updated;
    });
  };

  const clearOldAvatars = async () => {
    setClearing(true);
    try {
      // Delete all from database
      const { error: dbError } = await supabase
        .from('default_avatars')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (dbError) throw dbError;

      // List all files in the avatars bucket
      const { data: files, error: listError } = await supabase.storage
        .from('avatars')
        .list();

      if (listError) throw listError;

      // Delete all files from storage
      if (files && files.length > 0) {
        const filePaths = files.map(file => file.name);
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }

      toast.success(`Cleared ${files?.length || 0} old avatars`);
    } catch (error) {
      console.error('Error clearing avatars:', error);
      toast.error('Failed to clear old avatars');
    } finally {
      setClearing(false);
    }
  };

  const uploadAllAvatars = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    // Validate all files have names
    const missingNames = selectedFiles.some(f => !f.name.trim());
    if (missingNames) {
      toast.error("Please provide names for all avatars");
      return;
    }

    setUploading(true);
    setProgress(0);
    setUploadedAvatars([]);

    const total = selectedFiles.length;

    for (let i = 0; i < selectedFiles.length; i++) {
      const avatarFile = selectedFiles[i];
      
      try {
        console.log(`📤 Uploading ${avatarFile.name}...`);

        // Generate unique filename
        const fileExtension = avatarFile.file.name.split('.').pop();
        const fileName = `${avatarFile.category}-${avatarFile.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExtension}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile.file, {
            contentType: avatarFile.file.type,
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        // Save to database
        const { error: dbError } = await supabase
          .from('default_avatars')
          .insert({
            name: avatarFile.name,
            image_url: publicUrl,
            category: avatarFile.category
          });

        if (dbError) throw dbError;

        setUploadedAvatars(prev => [...prev, { 
          name: avatarFile.name, 
          category: avatarFile.category, 
          url: publicUrl 
        }]);

        setProgress(((i + 1) / total) * 100);
        toast.success(`✅ Uploaded ${avatarFile.name}`);

      } catch (error) {
        console.error(`❌ Error uploading ${avatarFile.name}:`, error);
        toast.error(`Failed to upload ${avatarFile.name}`);
      }
    }

    setUploading(false);
    
    // Clean up preview URLs
    selectedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setSelectedFiles([]);
    
    toast.success("🎉 All avatars uploaded successfully!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Avatar Manager</h1>
        <p className="text-muted-foreground">
          Upload and manage avatar images for user profiles
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Upload Avatars</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Select multiple image files to upload as avatars
            </p>

            <div className="flex gap-2">
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span>Select Files</span>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </Label>

              <Button 
                onClick={clearOldAvatars} 
                disabled={clearing || uploading}
                variant="destructive"
              >
                {clearing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Avatars
                  </>
                )}
              </Button>
            </div>
          </div>

          {selectedFiles.length > 0 && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    Selected Files ({selectedFiles.length})
                  </h3>
                  <Button 
                    onClick={uploadAllAvatars} 
                    disabled={uploading}
                    size="lg"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload All ({selectedFiles.length})
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {selectedFiles.map((avatarFile, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <div className="relative">
                          <img 
                            src={avatarFile.preview} 
                            alt={avatarFile.name}
                            className="w-full h-32 object-cover rounded-md"
                          />
                          <Button
                            size="icon"
                            variant="destructive"
                            className="absolute top-2 right-2 h-6 w-6"
                            onClick={() => removeFile(index)}
                            disabled={uploading}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <Label htmlFor={`name-${index}`} className="text-xs">
                              Avatar Name
                            </Label>
                            <Input
                              id={`name-${index}`}
                              value={avatarFile.name}
                              onChange={(e) => updateFileName(index, e.target.value)}
                              disabled={uploading}
                              className="h-8"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`category-${index}`} className="text-xs">
                              Category
                            </Label>
                            <Select
                              value={avatarFile.category}
                              onValueChange={(value) => updateFileCategory(index, value)}
                              disabled={uploading}
                            >
                              <SelectTrigger id={`category-${index}`} className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AVATAR_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Uploading avatars...
                    </span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {uploadedAvatars.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Recently Uploaded ({uploadedAvatars.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {uploadedAvatars.map((avatar, index) => (
              <div key={index} className="space-y-2">
                <Avatar className="w-20 h-20 mx-auto">
                  <AvatarImage src={avatar.url} alt={avatar.name} />
                  <AvatarFallback>{avatar.name[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-sm font-medium">{avatar.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {avatar.category}
                  </p>
                  <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mt-1" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
