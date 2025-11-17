import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const avatarPrompts = [
  // Humans - Professionals (12)
  { name: "Developer Girl", category: "human", prompt: "A cute cartoon avatar of a young female developer with purple hair and stylish glasses, sitting at a computer with code symbols around her, simple flat design, colorful, professional, friendly expression, transparent background, 1024x1024" },
  { name: "Manager Guy", category: "human", prompt: "A cute cartoon avatar of a confident male manager in a casual business suit, holding a coffee cup, friendly smile, simple flat design, colorful, professional, transparent background, 1024x1024" },
  { name: "Designer Girl", category: "human", prompt: "A cute cartoon avatar of a creative female designer with orange hair, holding art supplies, surrounded by color palettes, simple flat design, artistic, vibrant, transparent background, 1024x1024" },
  { name: "Tech Enthusiast", category: "human", prompt: "A cute cartoon avatar of an excited tech enthusiast with headphones and a laptop, surrounded by tech gadgets, simple flat design, colorful, energetic expression, transparent background, 1024x1024" },
  { name: "Wise Mentor", category: "human", prompt: "A cute cartoon avatar of a wise mentor with grey hair and kind expression, wearing casual professional attire, simple flat design, warm colors, approachable, transparent background, 1024x1024" },
  { name: "Team Player", category: "human", prompt: "A cute cartoon avatar of an energetic team player holding a coffee cup, with a big smile, wearing casual work attire, simple flat design, bright colors, transparent background, 1024x1024" },
  { name: "CEO Leader", category: "human", prompt: "A cute cartoon avatar of a CEO leader in formal attire with commanding presence, confident posture, simple flat design, professional colors, transparent background, 1024x1024" },
  { name: "Marketing Pro", category: "human", prompt: "A cute cartoon avatar of a marketing professional in creative vibrant outfit, enthusiastic expression, holding promotional materials, simple flat design, colorful, transparent background, 1024x1024" },
  { name: "Data Scientist", category: "human", prompt: "A cute cartoon avatar of a data scientist in lab coat with analytical expression and glasses, surrounded by charts and graphs, simple flat design, professional, transparent background, 1024x1024" },
  { name: "Customer Support", category: "human", prompt: "A cute cartoon avatar of a customer support representative wearing headset with friendly smile, helpful expression, simple flat design, warm colors, transparent background, 1024x1024" },
  { name: "Content Writer", category: "human", prompt: "A cute cartoon avatar of a content writer holding notebook with thoughtful expression, creative aura, simple flat design, artistic colors, transparent background, 1024x1024" },
  { name: "HR Manager", category: "human", prompt: "A cute cartoon avatar of an HR manager with warm smile, professional attire, approachable demeanor, simple flat design, friendly colors, transparent background, 1024x1024" },
  
  // Humans - Diverse Styles (8)
  { name: "Athlete", category: "human", prompt: "A cute cartoon avatar of an athlete in sporty attire with energetic pose, determined expression, holding sports equipment, simple flat design, dynamic colors, transparent background, 1024x1024" },
  { name: "Artist", category: "human", prompt: "A cute cartoon avatar of an artist holding paint palette with colorful splashes, creative hair style, simple flat design, vibrant artistic colors, transparent background, 1024x1024" },
  { name: "Musician", category: "human", prompt: "A cute cartoon avatar of a musician holding guitar with cool style, musical notes floating around, simple flat design, rhythmic colors, transparent background, 1024x1024" },
  { name: "Chef", category: "human", prompt: "A cute cartoon avatar of a chef wearing chef hat with joyful expression, holding cooking utensils, simple flat design, warm culinary colors, transparent background, 1024x1024" },
  { name: "Scientist", category: "human", prompt: "A cute cartoon avatar of a scientist wearing lab goggles with curious expression, holding test tubes, simple flat design, scientific colors, transparent background, 1024x1024" },
  { name: "Traveler", category: "human", prompt: "A cute cartoon avatar of a traveler with backpack and adventurous smile, holding a map, simple flat design, earthy exploration colors, transparent background, 1024x1024" },
  { name: "Gamer", category: "human", prompt: "A cute cartoon avatar of a gamer holding controller with focused expression, wearing headset, simple flat design, neon gaming colors, transparent background, 1024x1024" },
  { name: "Bookworm", category: "human", prompt: "A cute cartoon avatar of a bookworm with stack of books, wearing cozy sweater and glasses, simple flat design, warm literary colors, transparent background, 1024x1024" },
  
  // Animals - Cute & Professional (10)
  { name: "Smart Cat", category: "animal", prompt: "A cute cartoon avatar of an intelligent cat wearing glasses and reading a book, simple flat design, adorable, friendly, transparent background, 1024x1024" },
  { name: "Happy Dog", category: "animal", prompt: "A cute cartoon avatar of a golden retriever with a big happy smile, loyal expression, simple flat design, adorable, transparent background, 1024x1024" },
  { name: "Wise Owl", category: "animal", prompt: "A cute cartoon avatar of a wise owl wearing a graduation cap, perched on a branch, scholarly expression, simple flat design, transparent background, 1024x1024" },
  { name: "Clever Fox", category: "animal", prompt: "A cute cartoon avatar of a clever fox with a colorful scarf and cunning smile, simple flat design, playful, transparent background, 1024x1024" },
  { name: "Playful Panda", category: "animal", prompt: "A cute cartoon avatar of a playful panda holding bamboo with a happy expression, simple flat design, adorable, transparent background, 1024x1024" },
  { name: "Energetic Rabbit", category: "animal", prompt: "A cute cartoon avatar of an energetic rabbit holding a carrot, excited bouncy pose, simple flat design, adorable, transparent background, 1024x1024" },
  { name: "Cool Penguin", category: "animal", prompt: "A cute cartoon avatar of a cool penguin wearing a bow tie, sophisticated expression, simple flat design, adorable, transparent background, 1024x1024" },
  { name: "Business Bear", category: "animal", prompt: "A cute cartoon avatar of a business bear wearing tie and holding briefcase, professional demeanor, simple flat design, adorable, transparent background, 1024x1024" },
  { name: "Artistic Koala", category: "animal", prompt: "A cute cartoon avatar of an artistic koala holding paintbrush, creative expression, with eucalyptus leaves, simple flat design, adorable, transparent background, 1024x1024" },
  { name: "Tech Squirrel", category: "animal", prompt: "A cute cartoon avatar of a tech-savvy squirrel with tiny laptop, busy expression, simple flat design, adorable, transparent background, 1024x1024" },
  
  // Robots & Tech (8)
  { name: "Friendly Robot", category: "robot", prompt: "A cute cartoon avatar of a friendly robot with a round body, antenna, and happy LED face, simple flat design, futuristic, transparent background, 1024x1024" },
  { name: "AI Assistant", category: "robot", prompt: "A cute cartoon avatar of a sleek AI assistant with glowing blue elements and a friendly interface, simple flat design, high-tech, transparent background, 1024x1024" },
  { name: "Retro Bot", category: "robot", prompt: "A cute cartoon avatar of a retro robot with visible gears and cogs, vintage style, simple flat design, nostalgic colors, transparent background, 1024x1024" },
  { name: "Holo Avatar", category: "robot", prompt: "A cute cartoon avatar of a holographic digital character with particles and glowing effects, simple flat design, futuristic, transparent background, 1024x1024" },
  { name: "Nano Bot", category: "robot", prompt: "A cute cartoon avatar of a tiny nano bot with cute circuits and tech patterns, simple flat design, high-tech, transparent background, 1024x1024" },
  { name: "Space Robot", category: "robot", prompt: "A cute cartoon avatar of a space robot wearing astronaut helmet, cosmic theme with stars, simple flat design, futuristic, transparent background, 1024x1024" },
  { name: "Helper Droid", category: "robot", prompt: "A cute cartoon avatar of a helper droid with tools and gadgets, helpful expression, simple flat design, high-tech, transparent background, 1024x1024" },
  { name: "Code Bot", category: "robot", prompt: "A cute cartoon avatar of a code bot with binary code patterns, digital theme with matrix elements, simple flat design, futuristic, transparent background, 1024x1024" },
  
  // Fantasy & Magical (7)
  { name: "Cute Dragon", category: "fantasy", prompt: "A cute cartoon avatar of a tiny dragon with small wings and friendly fire breath, adorable scales, simple flat design, magical, transparent background, 1024x1024" },
  { name: "Rainbow Unicorn", category: "fantasy", prompt: "A cute cartoon avatar of a unicorn with a rainbow mane and sparkles, magical horn, simple flat design, enchanting, transparent background, 1024x1024" },
  { name: "Friendly Alien", category: "fantasy", prompt: "A cute cartoon avatar of a friendly alien with three eyes and antennae, green skin, simple flat design, whimsical, transparent background, 1024x1024" },
  { name: "Wizard Cat", category: "fantasy", prompt: "A cute cartoon avatar of a cat wearing a magical wizard hat with stars and holding a wand, mystical aura, simple flat design, transparent background, 1024x1024" },
  { name: "Fairy Friend", category: "fantasy", prompt: "A cute cartoon avatar of a fairy with delicate wings, surrounded by flowers and magical dust, simple flat design, enchanting, transparent background, 1024x1024" },
  { name: "Phoenix Bird", category: "fantasy", prompt: "A cute cartoon avatar of a phoenix bird with fire patterns and flames, majestic rising pose, simple flat design, magical, transparent background, 1024x1024" },
  { name: "Crystal Creature", category: "fantasy", prompt: "A cute cartoon avatar of a mystical creature with gemstone body, shimmering crystals, simple flat design, magical sparkles, transparent background, 1024x1024" },
  
  // Abstract & Fun (5)
  { name: "Sunshine", category: "abstract", prompt: "A cute cartoon avatar of a happy sun with smiling face and bright rays, cheerful expression, simple flat design, bright yellow, transparent background, 1024x1024" },
  { name: "Cloud Buddy", category: "abstract", prompt: "A cute cartoon avatar of a fluffy white cloud with smiling face, soft and friendly, simple flat design, whimsical, transparent background, 1024x1024" },
  { name: "Star Character", category: "abstract", prompt: "A cute cartoon avatar of a glowing star with cheerful face and sparkles, simple flat design, bright and fun, transparent background, 1024x1024" },
  { name: "Plant Friend", category: "abstract", prompt: "A cute cartoon avatar of a potted plant with happy face and green leaves, simple flat design, friendly and whimsical, transparent background, 1024x1024" },
  { name: "Gradient Ghost", category: "abstract", prompt: "A cute cartoon avatar of a friendly ghost with colorful gradient body and smiling face, simple flat design, fun and whimsical, transparent background, 1024x1024" },
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
