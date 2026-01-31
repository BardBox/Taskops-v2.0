import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link as LinkIcon, Image as ImageIcon, Video, Loader2, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddInspirationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    userId: string;
}

export function AddInspirationDialog({ open, onOpenChange, onSuccess, userId }: AddInspirationDialogProps) {
    const [type, setType] = useState<"link" | "image" | "video">("link");
    const [contentUrl, setContentUrl] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState("");
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && currentTag.trim()) {
            e.preventDefault();
            if (!tags.includes(currentTag.trim())) {
                setTags([...tags, currentTag.trim()]);
            }
            setCurrentTag("");
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size must be less than 5MB");
                return;
            }
            setSelectedFile(file);
        }
    };

    const uploadFile = async (file: File) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("inspiration-assets")
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from("inspiration-assets")
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSubmit = async () => {
        if (!description && !contentUrl && !selectedFile) {
            toast.error("Please add some content");
            return;
        }

        setUploading(true);
        try {
            let finalUrl = contentUrl;

            if (type !== 'link' && selectedFile) {
                finalUrl = await uploadFile(selectedFile);
            } else if (type === 'link' && !contentUrl) {
                toast.error("Please enter a URL");
                setUploading(false);
                return;
            }

            const { error } = await supabase.from("inspirations" as any).insert({
                user_id: userId,
                type,
                content_url: finalUrl,
                description,
                tags
            });

            if (error) throw error;

            toast.success("Inspiration added!");
            onSuccess();
            onOpenChange(false);

            // Reset form
            setContentUrl("");
            setDescription("");
            setTags([]);
            setSelectedFile(null);
            setType("link");

        } catch (error: any) {
            console.error(error);
            toast.error("Failed to add inspiration: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add to Inspiration Board</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <Tabs value={type} onValueChange={(v: any) => setType(v as any)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="link"><LinkIcon className="h-4 w-4 mr-2" />Link</TabsTrigger>
                            <TabsTrigger value="image"><ImageIcon className="h-4 w-4 mr-2" />Image</TabsTrigger>
                            <TabsTrigger value="video"><Video className="h-4 w-4 mr-2" />Video</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {type === 'link' ? (
                        <div className="space-y-2">
                            <Label>Link URL</Label>
                            <Input
                                placeholder="https://..."
                                value={contentUrl}
                                onChange={(e) => setContentUrl(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Upload {type === 'image' ? 'Image' : 'Video'}</Label>
                            <div
                                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {selectedFile ? (
                                    <div className="text-center">
                                        <p className="font-medium text-sm">{selectedFile.name}</p>
                                        <Button variant="link" size="sm" className="text-destructive h-auto p-0 mt-1" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
                                            Remove
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {type === 'image' ? <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" /> : <Video className="h-8 w-8 text-muted-foreground mb-2" />}
                                        <p className="text-sm text-muted-foreground">Click to upload (max 5MB)</p>
                                    </>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept={type === 'image' ? "image/*" : "video/*"}
                                    onChange={handleFileSelect}
                                    title="Upload file"
                                />
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            placeholder="Why is this inspiring?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tags (Press Enter)</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(tag => (
                                <span key={tag} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full flex items-center">
                                    #{tag}
                                    <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeTag(tag)} />
                                </span>
                            ))}
                        </div>
                        <Input
                            placeholder="Add a tag..."
                            value={currentTag}
                            onChange={(e) => setCurrentTag(e.target.value)}
                            onKeyDown={handleAddTag}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={uploading}>
                        {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Post
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
