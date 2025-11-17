import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const avatarPrompts = [
  // Humans (6)
  { name: "Developer Girl", category: "human", prompt: "A cute cartoon avatar of a friendly female developer with glasses and colorful purple hair, smiling, simple flat design, colorful, professional, transparent background, 512x512" },
  { name: "Manager Guy", category: "human", prompt: "A cute cartoon avatar of a professional male manager in casual attire with a friendly smile, simple flat design, colorful, professional, transparent background, 512x512" },
  { name: "Designer Girl", category: "human", prompt: "A cute cartoon avatar of a creative female designer with art supplies and bright orange hair, smiling, simple flat design, colorful, professional, transparent background, 512x512" },
  { name: "Tech Enthusiast", category: "human", prompt: "A cute cartoon avatar of a young male tech enthusiast with headphones and excited expression, simple flat design, colorful, professional, transparent background, 512x512" },
  { name: "Wise Mentor", category: "human", prompt: "A cute cartoon avatar of a wise elder mentor character with grey hair and kind smile, simple flat design, colorful, professional, transparent background, 512x512" },
  { name: "Team Player", category: "human", prompt: "A cute cartoon avatar of an energetic team member holding a coffee cup with happy expression, simple flat design, colorful, professional, transparent background, 512x512" },
  
  // Animals (7)
  { name: "Smart Cat", category: "animal", prompt: "A cute cartoon avatar of a smart cat wearing glasses reading a book, simple flat design, colorful, friendly, transparent background, 512x512" },
  { name: "Happy Dog", category: "animal", prompt: "A cute cartoon avatar of a loyal golden retriever with a big smile, simple flat design, colorful, friendly, transparent background, 512x512" },
  { name: "Wise Owl", category: "animal", prompt: "A cute cartoon avatar of a wise owl wearing a graduation cap, simple flat design, colorful, friendly, transparent background, 512x512" },
  { name: "Clever Fox", category: "animal", prompt: "A cute cartoon avatar of a clever fox wearing a colorful scarf, simple flat design, colorful, friendly, transparent background, 512x512" },
  { name: "Playful Panda", category: "animal", prompt: "A cute cartoon avatar of a playful panda holding bamboo with happy expression, simple flat design, colorful, friendly, transparent background, 512x512" },
  { name: "Energetic Rabbit", category: "animal", prompt: "A cute cartoon avatar of an energetic rabbit holding a carrot with excited expression, simple flat design, colorful, friendly, transparent background, 512x512" },
  { name: "Cool Penguin", category: "animal", prompt: "A cute cartoon avatar of a cool penguin wearing a bow tie, simple flat design, colorful, friendly, transparent background, 512x512" },
  
  // Robots & Tech (4)
  { name: "Friendly Robot", category: "robot", prompt: "A cute cartoon avatar of a friendly round robot with antenna and happy LED face, simple flat design, colorful, futuristic, transparent background, 512x512" },
  { name: "AI Assistant", category: "robot", prompt: "A cute cartoon avatar of a sleek AI assistant bot with glowing elements, simple flat design, colorful, futuristic, transparent background, 512x512" },
  { name: "Retro Bot", category: "robot", prompt: "A cute cartoon avatar of a retro robot with gears and cogs visible, simple flat design, colorful, vintage-tech style, transparent background, 512x512" },
  { name: "Holo Avatar", category: "robot", prompt: "A cute cartoon avatar of a futuristic holographic avatar with digital elements, simple flat design, colorful, high-tech, transparent background, 512x512" },
  
  // Fantasy & Fun (3)
  { name: "Cute Dragon", category: "fantasy", prompt: "A cute cartoon avatar of a small friendly dragon with tiny wings and happy expression, simple flat design, colorful, magical, transparent background, 512x512" },
  { name: "Rainbow Unicorn", category: "fantasy", prompt: "A cute cartoon avatar of a colorful unicorn with rainbow mane and sparkles, simple flat design, colorful, magical, transparent background, 512x512" },
  { name: "Friendly Alien", category: "fantasy", prompt: "A cute cartoon avatar of a friendly alien with three eyes and big smile, simple flat design, colorful, space-themed, transparent background, 512x512" },
];

export default function AvatarGenerator() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedAvatars, setGeneratedAvatars] = useState<any[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState("");

  const generateAllAvatars = async () => {
    setGenerating(true);
    setProgress(0);
    setGeneratedAvatars([]);

    const total = avatarPrompts.length;
    
    for (let i = 0; i < avatarPrompts.length; i++) {
      const avatar = avatarPrompts[i];
      setCurrentAvatar(avatar.name);

      try {
        // Generate image using edge function
        const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-avatar', {
          body: { 
            prompt: avatar.prompt,
            name: avatar.name,
            category: avatar.category
          }
        });

        if (functionError) throw functionError;
        if (!functionData?.imageUrl) throw new Error("No image generated");

        // Convert base64 to blob
        const base64Data = functionData.imageUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let j = 0; j < byteCharacters.length; j++) {
          byteNumbers[j] = byteCharacters.charCodeAt(j);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });

        // Upload to storage
        const fileName = `default-${avatar.category}-${Date.now()}-${i}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, {
            contentType: 'image/png',
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
            name: avatar.name,
            image_url: publicUrl,
            category: avatar.category
          });

        if (dbError) throw dbError;

        setGeneratedAvatars(prev => [...prev, { ...avatar, url: publicUrl }]);
        setProgress(((i + 1) / total) * 100);

        toast.success(`Generated ${avatar.name}`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error generating ${avatar.name}:`, error);
        toast.error(`Failed to generate ${avatar.name}`);
      }
    }

    setGenerating(false);
    setCurrentAvatar("");
    toast.success("All avatars generated!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Avatar Generator</h1>
        <p className="text-muted-foreground">
          Generate 20 unique cartoon character avatars for users
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Generate Avatar Set</h2>
              <p className="text-sm text-muted-foreground">
                This will generate {avatarPrompts.length} unique cartoon avatars using AI
              </p>
            </div>
            <Button 
              onClick={generateAllAvatars} 
              disabled={generating}
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate All Avatars
                </>
              )}
            </Button>
          </div>

          {generating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Generating: {currentAvatar}
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
        </div>
      </Card>

      {generatedAvatars.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Generated Avatars</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {generatedAvatars.map((avatar, index) => (
              <div key={index} className="space-y-2">
                <Avatar className="w-20 h-20 mx-auto">
                  <AvatarImage src={avatar.url} alt={avatar.name} />
                  <AvatarFallback>{avatar.name[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-sm font-medium">{avatar.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{avatar.category}</p>
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
