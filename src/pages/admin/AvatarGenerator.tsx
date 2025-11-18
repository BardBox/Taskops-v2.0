import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, Sparkles, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// 50 diverse avatar prompts with distinct personalities
const AVATAR_LIBRARY = [
  // Professional & Business (10)
  { name: "Executive Emma", prompt: "professional businesswoman with glasses, confident smile, corporate attire", category: "human" },
  { name: "Tech Guru Tom", prompt: "tech professional with headphones, casual hoodie, friendly demeanor", category: "human" },
  { name: "Doctor Diana", prompt: "medical professional in scrubs, warm smile, stethoscope", category: "human" },
  { name: "Professor Paul", prompt: "academic with bow tie, scholarly appearance, wise expression", category: "human" },
  { name: "Chef Carlos", prompt: "cheerful chef with chef's hat, culinary professional", category: "human" },
  { name: "Artist Aria", prompt: "creative artist with paint splashes, colorful aesthetic", category: "human" },
  { name: "Engineer Eric", prompt: "engineer with hard hat, blueprints, determined look", category: "human" },
  { name: "Designer Dina", prompt: "fashion designer with stylish outfit, creative flair", category: "human" },
  { name: "Pilot Pete", prompt: "airline pilot in uniform, aviator sunglasses, professional", category: "human" },
  { name: "Scientist Sara", prompt: "lab scientist with safety goggles, enthusiastic researcher", category: "human" },
  
  // Fantasy & Mystical (10)
  { name: "Wizard Waldo", prompt: "wise wizard with long beard, pointed hat, mystical aura", category: "fantasy" },
  { name: "Fairy Flora", prompt: "delicate fairy with wings, flower crown, magical glow", category: "fantasy" },
  { name: "Knight Kevin", prompt: "brave knight in shining armor, heroic stance", category: "fantasy" },
  { name: "Elf Elara", prompt: "elegant elf with pointed ears, forest guardian", category: "fantasy" },
  { name: "Dragon Drake", prompt: "friendly dragon with scales, wise eyes, mythical", category: "fantasy" },
  { name: "Mermaid Marina", prompt: "ocean mermaid with seashell accessories, underwater vibe", category: "fantasy" },
  { name: "Phoenix Phoebe", prompt: "majestic phoenix with fiery feathers, rebirth symbol", category: "fantasy" },
  { name: "Unicorn Una", prompt: "magical unicorn with rainbow mane, pure white coat", category: "fantasy" },
  { name: "Gnome Gideon", prompt: "garden gnome with pointy hat, jovial expression", category: "fantasy" },
  { name: "Vampire Victor", prompt: "elegant vampire with cape, mysterious charm", category: "fantasy" },
  
  // Animals & Creatures (15)
  { name: "Lion Leo", prompt: "majestic lion with golden mane, regal presence", category: "animal" },
  { name: "Panda Po", prompt: "cute panda eating bamboo, friendly expression", category: "animal" },
  { name: "Fox Finn", prompt: "clever fox with bushy tail, mischievous smile", category: "animal" },
  { name: "Owl Olivia", prompt: "wise owl with big eyes, perched on branch", category: "animal" },
  { name: "Penguin Percy", prompt: "adorable penguin with bow tie, waddling charm", category: "animal" },
  { name: "Cat Chloe", prompt: "elegant cat with green eyes, mysterious aura", category: "animal" },
  { name: "Dog Duke", prompt: "loyal golden retriever, happy and energetic", category: "animal" },
  { name: "Rabbit Ruby", prompt: "cute rabbit with floppy ears, soft and fluffy", category: "animal" },
  { name: "Bear Bruno", prompt: "friendly teddy bear, warm and huggable", category: "animal" },
  { name: "Dolphin Dolly", prompt: "playful dolphin jumping through waves", category: "animal" },
  { name: "Koala Ken", prompt: "sleepy koala hugging eucalyptus branch", category: "animal" },
  { name: "Tiger Tina", prompt: "powerful tiger with stripes, fierce yet noble", category: "animal" },
  { name: "Elephant Ella", prompt: "wise elephant with large ears, gentle giant", category: "animal" },
  { name: "Monkey Max", prompt: "playful monkey swinging, energetic and fun", category: "animal" },
  { name: "Turtle Theo", prompt: "peaceful sea turtle, calm and patient", category: "animal" },
  
  // Robots & Futuristic (15)
  { name: "Robo Ray", prompt: "friendly robot with LED eyes, helpful assistant", category: "robot" },
  { name: "Cyber Cece", prompt: "futuristic android with sleek design, neon accents", category: "robot" },
  { name: "Droid Dave", prompt: "maintenance droid with tools, hardworking bot", category: "robot" },
  { name: "Bot Betty", prompt: "cute robot with antenna, expressive digital face", category: "robot" },
  { name: "Mech Mike", prompt: "mechanical warrior robot, strong and protective", category: "robot" },
  { name: "AI Alice", prompt: "holographic AI assistant, glowing interface", category: "robot" },
  { name: "Circuit Chris", prompt: "tech robot with circuit patterns, electric vibe", category: "robot" },
  { name: "Nano Nina", prompt: "tiny nanobot with microscopic details, advanced tech", category: "robot" },
  { name: "Quantum Quinn", prompt: "quantum computer robot, glowing particles", category: "robot" },
  { name: "Steam Sam", prompt: "steampunk robot with brass gears, vintage mech", category: "robot" },
  { name: "Pixel Pete", prompt: "retro 8-bit robot, pixelated charm, nostalgic", category: "robot" },
  { name: "Space Stella", prompt: "astronaut robot for space missions, cosmic explorer", category: "robot" },
  { name: "Solar Sol", prompt: "solar-powered robot with panels, eco-friendly", category: "robot" },
  { name: "Binary Ben", prompt: "code-themed robot with binary numbers, programmer bot", category: "robot" },
  { name: "Gadget Gina", prompt: "multi-tool robot with gadgets, inventive design", category: "robot" },
];

export default function AvatarGenerator() {
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [generatedCount, setGeneratedCount] = useState(0);

  const generateDefaultLibrary = async () => {
    setGenerating(true);
    setProgress(0);
    setGeneratedCount(0);
    const total = AVATAR_LIBRARY.length;
    let successCount = 0;

    try {
      for (let i = 0; i < total; i++) {
        const avatarData = AVATAR_LIBRARY[i];
        const fullPrompt = `${avatarData.prompt}, high quality avatar portrait, professional digital art`;
        
        setCurrentAvatar(avatarData.name);
        console.log(`Generating ${i + 1}/${total}: ${avatarData.name}`);

        try {
          const { data, error } = await supabase.functions.invoke('generate-avatar', {
            body: { 
              prompt: fullPrompt, 
              name: avatarData.name, 
              category: avatarData.category 
            }
          });

          if (error) throw error;

          if (data?.imageUrl) {
            // Convert base64 to blob
            const base64Response = await fetch(data.imageUrl);
            const blob = await base64Response.blob();
            
            // Upload to storage
            const fileName = `${Date.now()}_${avatarData.name.toLowerCase().replace(/\s+/g, '_')}.png`;
            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(fileName, blob, {
                contentType: 'image/png',
                cacheControl: '3600',
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
                name: avatarData.name,
                image_url: publicUrl,
                category: avatarData.category,
              });

            if (dbError) throw dbError;

            successCount++;
            setGeneratedCount(successCount);
            console.log(`✅ Saved: ${avatarData.name}`);
          }
        } catch (err) {
          console.error(`Failed to generate ${avatarData.name}:`, err);
          toast.error(`Failed to generate ${avatarData.name}`);
        }

        setProgress(((i + 1) / total) * 100);
        
        // Add delay to avoid rate limiting
        if (i < total - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      toast.success(`Successfully generated ${successCount} out of ${total} avatars!`);
    } catch (error) {
      console.error('Error generating avatar library:', error);
      toast.error('Failed to generate avatar library');
    } finally {
      setGenerating(false);
      setProgress(0);
      setCurrentAvatar("");
    }
  };

  const clearAllAvatars = async () => {
    setClearing(true);
    try {
      // Delete all from database
      const { error: dbError } = await supabase
        .from('default_avatars')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

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

      toast.success(`Cleared ${files?.length || 0} avatars`);
      setGeneratedCount(0);
    } catch (error) {
      console.error('Error clearing avatars:', error);
      toast.error('Failed to clear avatars');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avatar Library Manager</h1>
          <p className="text-muted-foreground mt-2">
            Generate the default avatar library for users to choose from
          </p>
        </div>
        <Button 
          variant="destructive" 
          onClick={clearAllAvatars}
          disabled={clearing || generating}
        >
          {clearing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Clearing...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </>
          )}
        </Button>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Generate Default Library</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Generate 50 diverse, fun avatars across different categories for users to choose from.
              This includes professionals, fantasy creatures, animals, and robots with distinct personalities.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-6">
              ⚠️ This will take approximately 2-3 minutes to complete. Each avatar is generated individually
              with a 2-second delay to respect rate limits.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">50</div>
              <div className="text-sm text-muted-foreground">Total Avatars</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">10</div>
              <div className="text-sm text-muted-foreground">Professionals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">10</div>
              <div className="text-sm text-muted-foreground">Fantasy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">15</div>
              <div className="text-sm text-muted-foreground">Animals</div>
            </div>
            <div className="text-center md:col-start-2">
              <div className="text-2xl font-bold text-orange-600">15</div>
              <div className="text-sm text-muted-foreground">Robots</div>
            </div>
          </div>

          <Button 
            onClick={generateDefaultLibrary}
            disabled={generating}
            className="w-full"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating... {Math.round(progress)}%
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate 50 Avatar Library
              </>
            )}
          </Button>

          {generating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Generating {currentAvatar}...</span>
                <span className="font-medium">{generatedCount} / 50</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {generatedCount > 0 && !generating && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Successfully generated {generatedCount} avatars!</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-muted/30">
        <h3 className="text-lg font-semibold mb-3">Preview Sample Avatars</h3>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
          {AVATAR_LIBRARY.slice(0, 10).map((avatar, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <Avatar className="h-12 w-12 bg-secondary border-2">
                <AvatarFallback className="text-xs">{avatar.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-center line-clamp-2">{avatar.name}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Showing 10 of 50 avatars that will be generated
        </p>
      </Card>
    </div>
  );
}
