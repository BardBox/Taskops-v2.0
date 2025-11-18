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
  
  // Humans - More Professionals (8)
  { name: "Sales Expert", category: "human", prompt: "A cute cartoon avatar of a confident sales expert with big smile, modern suit, presentation board, energetic pose, simple flat design, professional, transparent background, 1024x1024" },
  { name: "Financial Advisor", category: "human", prompt: "A cute cartoon avatar of a trustworthy financial advisor with glasses, calculator, professional attire, confident expression, simple flat design, transparent background, 1024x1024" },
  { name: "Architect", category: "human", prompt: "A cute cartoon avatar of a creative architect with blueprints, hard hat, pencil, thoughtful expression, simple flat design, artistic, transparent background, 1024x1024" },
  { name: "Nurse", category: "human", prompt: "A cute cartoon avatar of a caring nurse in medical scrubs with stethoscope, warm smile, compassionate expression, simple flat design, healthcare colors, transparent background, 1024x1024" },
  { name: "Teacher", category: "human", prompt: "A cute cartoon avatar of a patient teacher with glasses, books and apple, kind expression, simple flat design, educational vibe, transparent background, 1024x1024" },
  { name: "Photographer", category: "human", prompt: "A cute cartoon avatar of an artistic photographer with camera around neck, adventurous outfit, excited expression, simple flat design, creative energy, transparent background, 1024x1024" },
  { name: "Journalist", category: "human", prompt: "A cute cartoon avatar of an investigative journalist with notepad and microphone, determined expression, professional attire, simple flat design, transparent background, 1024x1024" },
  { name: "Lawyer", category: "human", prompt: "A cute cartoon avatar of a confident lawyer with briefcase, formal suit, professional glasses, trustworthy expression, simple flat design, transparent background, 1024x1024" },
  
  // Humans - Hobbies & Creative (8)
  { name: "Gardener", category: "human", prompt: "A cute cartoon avatar of a happy gardener with flowers, sun hat, gardening gloves, surrounded by plants, peaceful expression, simple flat design, natural colors, transparent background, 1024x1024" },
  { name: "Baker", category: "human", prompt: "A cute cartoon avatar of a cheerful baker with apron, rolling pin, flour dust on cheeks, chef hat, warm smile, simple flat design, baking colors, transparent background, 1024x1024" },
  { name: "Dancer", category: "human", prompt: "A cute cartoon avatar of a graceful dancer in ballet shoes, flowing hair, elegant pose, tutu or dance outfit, simple flat design, artistic expression, transparent background, 1024x1024" },
  { name: "Swimmer", category: "human", prompt: "A cute cartoon avatar of an energetic swimmer with goggles, swimsuit, water drops, swimming cap, athletic build, simple flat design, aquatic colors, transparent background, 1024x1024" },
  { name: "Cyclist", category: "human", prompt: "A cute cartoon avatar of an enthusiastic cyclist with helmet, bike gear, sporty outfit, energetic pose, simple flat design, adventure colors, transparent background, 1024x1024" },
  { name: "Yogi", category: "human", prompt: "A cute cartoon avatar of a peaceful yogi in meditation pose, zen expression, yoga mat, comfortable clothing, calm aura, simple flat design, spiritual colors, transparent background, 1024x1024" },
  { name: "Potter", category: "human", prompt: "A cute cartoon avatar of an artistic potter with clay on hands, spinning wheel, focused expression, handmade pottery, simple flat design, artisan vibe, transparent background, 1024x1024" },
  { name: "Astronomer", category: "human", prompt: "A cute cartoon avatar of a curious astronomer with telescope, starry eyes, notebook, fascinated expression, nighttime theme, simple flat design, cosmic colors, transparent background, 1024x1024" },
  
  // Animals - Wild & Domestic (8)
  { name: "Curious Raccoon", category: "animal", prompt: "A cute cartoon avatar of a curious raccoon with mask pattern, clever expression, holding something shiny, playful pose, simple flat design, mischievous colors, transparent background, 1024x1024" },
  { name: "Sleepy Sloth", category: "animal", prompt: "A cute cartoon avatar of a peaceful sloth hanging from branch, sleepy eyes, slow smile, fuzzy fur, relaxed pose, simple flat design, calm colors, transparent background, 1024x1024" },
  { name: "Brave Lion", category: "animal", prompt: "A cute cartoon avatar of a regal lion with magnificent mane, confident expression, noble pose, simple flat design, warm majestic colors, transparent background, 1024x1024" },
  { name: "Wise Turtle", category: "animal", prompt: "A cute cartoon avatar of an ancient wise turtle with patterned shell, calm eyes, gentle smile, patient expression, simple flat design, serene colors, transparent background, 1024x1024" },
  { name: "Cheerful Monkey", category: "animal", prompt: "A cute cartoon avatar of a playful monkey holding banana, big smile, swinging pose, energetic expression, simple flat design, fun-loving colors, transparent background, 1024x1024" },
  { name: "Elegant Swan", category: "animal", prompt: "A cute cartoon avatar of a graceful swan with long curved neck, white feathers, serene expression, beautiful pose, simple flat design, elegant colors, transparent background, 1024x1024" },
  { name: "Busy Bee", category: "animal", prompt: "A cute cartoon avatar of a hardworking bee with yellow and black stripes, tiny wings, carrying pollen, happy expression, simple flat design, buzzing energy, transparent background, 1024x1024" },
  { name: "Gentle Deer", category: "animal", prompt: "A cute cartoon avatar of a gentle deer with small antlers, soft eyes, forest vibe, peaceful expression, spots pattern, simple flat design, nature colors, transparent background, 1024x1024" },
  
  // More Animals (8)
  { name: "Playful Otter", category: "animal", prompt: "A cute cartoon avatar of a joyful otter swimming, holding fish, playful expression, water splashes, whiskers, simple flat design, fun-loving colors, transparent background, 1024x1024" },
  { name: "Noble Eagle", category: "animal", prompt: "A cute cartoon avatar of a majestic eagle with spread wings, sharp eyes, proud expression, flying pose, simple flat design, powerful colors, transparent background, 1024x1024" },
  { name: "Funny Llama", category: "animal", prompt: "A cute cartoon avatar of a quirky llama with fluffy fur, funny expression, colorful blanket on back, silly smile, simple flat design, unique colors, transparent background, 1024x1024" },
  { name: "Smart Dolphin", category: "animal", prompt: "A cute cartoon avatar of an intelligent dolphin jumping out of water, friendly smile, playful expression, ocean waves, simple flat design, joyful colors, transparent background, 1024x1024" },
  { name: "Cozy Hamster", category: "animal", prompt: "A cute cartoon avatar of a chubby hamster with full cheeks, tiny paws, adorable expression, fluffy fur, simple flat design, cute colors, transparent background, 1024x1024" },
  { name: "Elegant Peacock", category: "animal", prompt: "A cute cartoon avatar of a proud peacock with colorful tail feathers spread, beautiful patterns, regal pose, simple flat design, vibrant colors, transparent background, 1024x1024" },
  { name: "Loyal Wolf", category: "animal", prompt: "A cute cartoon avatar of a strong wolf with pack leader vibe, protective expression, noble stance, grey fur, simple flat design, trustworthy colors, transparent background, 1024x1024" },
  { name: "Silly Goat", category: "animal", prompt: "A cute cartoon avatar of a mischievous goat with small horns, funny face, playful expression, eating something, simple flat design, quirky colors, transparent background, 1024x1024" },
  
  // Robots & Tech - Diverse Styles (8)
  { name: "Pixel Bot", category: "robot", prompt: "A cute cartoon avatar of a retro pixel robot in 8-bit style, blocky design, gaming vibe, colorful pixels, simple flat design, nostalgic colors, transparent background, 1024x1024" },
  { name: "Steampunk Robot", category: "robot", prompt: "A cute cartoon avatar of a Victorian steampunk robot with brass gears, copper pipes, vintage style, clockwork elements, simple flat design, industrial colors, transparent background, 1024x1024" },
  { name: "Cyber Guardian", category: "robot", prompt: "A cute cartoon avatar of a futuristic cyber guardian with neon blue lines, protective stance, shield, digital armor, simple flat design, high-tech colors, transparent background, 1024x1024" },
  { name: "Mini Drone", category: "robot", prompt: "A cute cartoon avatar of a small flying drone with propellers, camera lens, hovering pose, surveillance tech, simple flat design, modern colors, transparent background, 1024x1024" },
  { name: "Digital Assistant", category: "robot", prompt: "A cute cartoon avatar of a helpful digital assistant with holographic interface, floating screens, AI elements, simple flat design, modern tech colors, transparent background, 1024x1024" },
  { name: "Mech Warrior", category: "robot", prompt: "A cute cartoon avatar of a powerful mech warrior with heavy armor, battle-ready pose, strong build, simple flat design, military tech colors, transparent background, 1024x1024" },
  { name: "Companion Bot", category: "robot", prompt: "A cute cartoon avatar of a friendly companion bot with round body, expressive LED face, helpful arms, simple flat design, warm adorable colors, transparent background, 1024x1024" },
  { name: "Quantum Bot", category: "robot", prompt: "A cute cartoon avatar of an advanced quantum bot with glowing particles, scientific symbols, floating elements, mysterious energy, simple flat design, futuristic colors, transparent background, 1024x1024" },
  
  // Fantasy & Magical - Mythical Beings (10)
  { name: "Mermaid", category: "fantasy", prompt: "A cute cartoon avatar of a friendly mermaid with colorful scales, flowing hair, ocean waves, seashells, simple flat design, magical underwater colors, transparent background, 1024x1024" },
  { name: "Griffin", category: "fantasy", prompt: "A cute cartoon avatar of a majestic griffin with eagle head, lion body, wings spread, powerful pose, simple flat design, mythical colors, transparent background, 1024x1024" },
  { name: "Pegasus", category: "fantasy", prompt: "A cute cartoon avatar of a beautiful pegasus with white coat, angel wings, flying pose, magical aura, clouds, simple flat design, dreamy colors, transparent background, 1024x1024" },
  { name: "Garden Gnome", category: "fantasy", prompt: "A cute cartoon avatar of a cheerful garden gnome with pointy red hat, white beard, mushrooms, flowers, holding lantern, simple flat design, whimsical colors, transparent background, 1024x1024" },
  { name: "Elf Archer", category: "fantasy", prompt: "A cute cartoon avatar of a skilled elf archer with pointed ears, bow and arrow, forest guardian outfit, focused expression, simple flat design, nature colors, transparent background, 1024x1024" },
  { name: "Friendly Witch", category: "fantasy", prompt: "A cute cartoon avatar of a kind witch with magical hat, broomstick, black cat companion, spell book, stars and moon, simple flat design, magical colors, transparent background, 1024x1024" },
  { name: "Cute Vampire", category: "fantasy", prompt: "A cute cartoon avatar of a friendly vampire with small fangs, dark cape, nighttime theme, moon and stars, playful not scary, simple flat design, charming colors, transparent background, 1024x1024" },
  { name: "Werewolf", category: "fantasy", prompt: "A cute cartoon avatar of a friendly werewolf with fluffy fur, howling at full moon, wolf ears, playful expression, simple flat design, nighttime colors, transparent background, 1024x1024" },
  { name: "Guardian Angel", category: "fantasy", prompt: "A cute cartoon avatar of a protective guardian angel with white wings, glowing halo, peaceful expression, flowing robes, simple flat design, heavenly colors, transparent background, 1024x1024" },
  { name: "Fire Demon", category: "fantasy", prompt: "A cute cartoon avatar of a playful fire demon with small horns, flame patterns, mischievous smile, red and orange colors, friendly not scary, simple flat design, transparent background, 1024x1024" },
];

export default function AvatarGenerator() {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedAvatars, setGeneratedAvatars] = useState<any[]>([]);
  const [currentAvatar, setCurrentAvatar] = useState("");
  const [clearing, setClearing] = useState(false);

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

  const generateAllAvatars = async () => {
    setGenerating(true);
    setProgress(0);
    setGeneratedAvatars([]);

    const total = avatarPrompts.length;
    
    for (let i = 0; i < avatarPrompts.length; i++) {
      const avatar = avatarPrompts[i];
      setCurrentAvatar(avatar.name);

      try {
        console.log(`🎨 Generating ${avatar.name} with Gemini 2.5 Flash Image...`);
        
        // Call the edge function to generate image with Gemini
        const { data: functionData, error: functionError } = await supabase.functions.invoke('generate-avatar', {
          body: { 
            prompt: avatar.prompt,
            name: avatar.name,
            category: avatar.category
          }
        });

        if (functionError) throw functionError;
        if (!functionData?.imageUrl) throw new Error('No image returned from function');

        // Convert data URL to blob
        const response = await fetch(functionData.imageUrl);
        const blob = await response.blob();

        // Upload to storage
        const fileName = `gemini-${avatar.category}-${avatar.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
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

        toast.success(`✨ Generated ${avatar.name}`);

        // Small delay between generations
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error generating ${avatar.name}:`, error);
        toast.error(`Failed to generate ${avatar.name}`);
      }
    }

    setGenerating(false);
    setCurrentAvatar("");
    toast.success("🎉 All avatars generated with Gemini 2.5 Flash Image!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Avatar Generator</h1>
        <p className="text-muted-foreground">
          Generate 100 unique high-quality avatars using Gemini 2.5 Flash Image
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Generate Avatar Set with Gemini 2.5 Flash Image</h2>
              <p className="text-sm text-muted-foreground">
                Generate {avatarPrompts.length} unique, high-quality cartoon avatars using Google's Gemini AI
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={clearOldAvatars} 
                disabled={clearing || generating}
                variant="destructive"
                size="lg"
              >
                {clearing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Clearing...
                  </>
                ) : (
                  'Clear Old Avatars'
                )}
              </Button>
              <Button 
                onClick={generateAllAvatars} 
                disabled={generating || clearing}
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
