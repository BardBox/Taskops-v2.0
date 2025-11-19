import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Trash2, Sparkles, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// 100 diverse avatar prompts across 8 distinct categories
const AVATAR_LIBRARY = [
  // Animal (13)
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
  { name: "Tiger Tina", prompt: "powerful tiger with stripes, fierce yet noble", category: "animal" },
  { name: "Elephant Ella", prompt: "wise elephant with large ears, gentle giant", category: "animal" },
  { name: "Wolf Wyatt", prompt: "noble wolf with silver fur, pack leader", category: "animal" },
  
  // Fantasy (13)
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
  { name: "Centaur Carl", prompt: "noble centaur warrior, half-human half-horse", category: "fantasy" },
  { name: "Pixie Penny", prompt: "tiny pixie with sparkles, mischievous sprite", category: "fantasy" },
  { name: "Troll Trent", prompt: "friendly troll under bridge, stone-like appearance", category: "fantasy" },
  
  // Human (13)
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
  { name: "Athlete Alex", prompt: "sports champion with medals, athletic build, determined", category: "human" },
  { name: "Musician Mia", prompt: "rock star with guitar, energetic performer", category: "human" },
  { name: "Explorer Eddie", prompt: "adventurer with backpack and compass, explorer spirit", category: "human" },
  
  // SuperHero (12)
  { name: "Thunder Strike", prompt: "superhero with lightning powers, electric cape, heroic pose", category: "superhero" },
  { name: "Solar Flare", prompt: "sun-powered hero with golden suit, radiant energy", category: "superhero" },
  { name: "Shadow Walker", prompt: "stealth hero in dark suit, mysterious protector", category: "superhero" },
  { name: "Ice Guardian", prompt: "frost hero with ice powers, crystalline armor", category: "superhero" },
  { name: "Flame Phoenix", prompt: "fire hero with blazing wings, heroic flames", category: "superhero" },
  { name: "Wind Rider", prompt: "air-powered hero with flowing cape, sky master", category: "superhero" },
  { name: "Earth Shaker", prompt: "ground-controlling hero, rock armor, strength", category: "superhero" },
  { name: "Wave Breaker", prompt: "water hero with tidal powers, ocean protector", category: "superhero" },
  { name: "Star Beam", prompt: "cosmic hero with starlight powers, space guardian", category: "superhero" },
  { name: "Tech Knight", prompt: "technology-powered hero, high-tech armor, gadgets", category: "superhero" },
  { name: "Nature's Wrath", prompt: "plant-controlling hero, green powers, eco-warrior", category: "superhero" },
  { name: "Speed Bolt", prompt: "super-fast hero with lightning trails, speed force", category: "superhero" },
  
  // Supervillain (12)
  { name: "Dark Reaper", prompt: "sinister villain with dark cloak, ominous presence", category: "supervillain" },
  { name: "Venom Strike", prompt: "toxic villain with poisonous powers, menacing", category: "supervillain" },
  { name: "Frost King", prompt: "ice villain with frozen heart, cold ruler", category: "supervillain" },
  { name: "Inferno Lord", prompt: "fire villain with burning rage, destructive flames", category: "supervillain" },
  { name: "Mind Bender", prompt: "psychic villain with telepathic powers, manipulative", category: "supervillain" },
  { name: "Shadow Master", prompt: "darkness-wielding villain, shadow controller", category: "supervillain" },
  { name: "Chaos Agent", prompt: "anarchist villain, unpredictable and dangerous", category: "supervillain" },
  { name: "Mecha Menace", prompt: "robotic villain with mechanical army, tech terror", category: "supervillain" },
  { name: "Void Walker", prompt: "dimension-traveling villain, reality warper", category: "supervillain" },
  { name: "Storm Tyrant", prompt: "weather-controlling villain, tempest master", category: "supervillain" },
  { name: "Plague Doctor", prompt: "bio-hazard villain with toxic experiments, mad scientist", category: "supervillain" },
  { name: "Nightmare King", prompt: "fear-inducing villain, master of nightmares", category: "supervillain" },
  
  // Droid (12)
  { name: "Robo Rover", prompt: "friendly service robot, helpful companion bot", category: "droid" },
  { name: "Cyber Sentinel", prompt: "security droid with shields, protective guardian", category: "droid" },
  { name: "Droid Dave", prompt: "maintenance droid with tools, hardworking bot", category: "droid" },
  { name: "Bot Betty", prompt: "cute robot with antenna, expressive digital face", category: "droid" },
  { name: "Mech Mike", prompt: "mechanical warrior robot, strong and protective", category: "droid" },
  { name: "AI Alice", prompt: "holographic AI assistant, glowing interface", category: "droid" },
  { name: "Circuit Chris", prompt: "tech robot with circuit patterns, electric vibe", category: "droid" },
  { name: "Nano Nina", prompt: "tiny nanobot with microscopic details, advanced tech", category: "droid" },
  { name: "Steam Sam", prompt: "steampunk robot with brass gears, vintage mech", category: "droid" },
  { name: "Pixel Pete", prompt: "retro 8-bit robot, pixelated charm, nostalgic", category: "droid" },
  { name: "Solar Sol", prompt: "solar-powered robot with panels, eco-friendly", category: "droid" },
  { name: "Binary Ben", prompt: "code-themed robot with binary numbers, programmer bot", category: "droid" },
  
  // Abstract (12)
  { name: "Cosmic Swirl", prompt: "abstract cosmic patterns, swirling galaxies, space art", category: "abstract" },
  { name: "Neon Pulse", prompt: "vibrant neon lights, pulsing energy waves, electric art", category: "abstract" },
  { name: "Geometric Mind", prompt: "abstract geometric shapes, mathematical patterns", category: "abstract" },
  { name: "Color Burst", prompt: "explosion of colors, paint splatter art, vibrant chaos", category: "abstract" },
  { name: "Digital Dream", prompt: "glitch art aesthetic, digital distortion, cyber patterns", category: "abstract" },
  { name: "Liquid Flow", prompt: "flowing liquid patterns, fluid art, dynamic motion", category: "abstract" },
  { name: "Crystal Matrix", prompt: "crystalline structures, prismatic light, geometric crystals", category: "abstract" },
  { name: "Wave Form", prompt: "sound wave visualization, audio patterns, frequency art", category: "abstract" },
  { name: "Particle Cloud", prompt: "particle system art, floating dots, connected network", category: "abstract" },
  { name: "Fractal Zone", prompt: "fractal patterns, infinite recursion, mathematical beauty", category: "abstract" },
  { name: "Gradient Sphere", prompt: "smooth color gradients, spherical forms, soft transitions", category: "abstract" },
  { name: "Chaos Theory", prompt: "chaotic patterns, butterfly effect visualization, complex systems", category: "abstract" },
  
  // Nature (13)
  { name: "Mountain Peak", prompt: "majestic mountain summit, snowy peak, alpine landscape", category: "nature" },
  { name: "Ocean Wave", prompt: "powerful ocean wave, turquoise water, coastal beauty", category: "nature" },
  { name: "Forest Spirit", prompt: "ancient forest, mystical trees, woodland atmosphere", category: "nature" },
  { name: "Desert Sunset", prompt: "golden desert dunes, sunset colors, vast landscape", category: "nature" },
  { name: "Aurora Sky", prompt: "northern lights, aurora borealis, night sky magic", category: "nature" },
  { name: "Tropical Paradise", prompt: "tropical beach, palm trees, crystal clear water", category: "nature" },
  { name: "Autumn Leaves", prompt: "fall foliage, colorful leaves, autumn season", category: "nature" },
  { name: "Winter Frost", prompt: "snow-covered landscape, icicles, winter wonderland", category: "nature" },
  { name: "Spring Bloom", prompt: "blooming flowers, cherry blossoms, spring season", category: "nature" },
  { name: "Waterfall Flow", prompt: "cascading waterfall, misty spray, flowing water", category: "nature" },
  { name: "Canyon Depth", prompt: "deep canyon walls, rock formations, geological wonder", category: "nature" },
  { name: "Starry Night", prompt: "star-filled sky, milky way, night cosmos", category: "nature" },
  { name: "Volcanic Fire", prompt: "active volcano, lava flow, natural power", category: "nature" },
];

// Personality templates for generating unique avatars per category
const PERSONALITY_TEMPLATES = {
  human: [
    "professional", "casual", "elegant", "sporty", "artistic", 
    "intellectual", "cheerful", "serious", "friendly", "confident",
    "creative", "wise", "energetic", "calm", "bold",
    "gentle", "determined", "curious", "warm", "sophisticated"
  ],
  animal: [
    "playful", "wise", "fierce", "gentle", "curious",
    "loyal", "mischievous", "noble", "friendly", "mysterious",
    "energetic", "calm", "brave", "silly", "majestic",
    "clever", "strong", "swift", "cunning", "graceful"
  ],
  fantasy: [
    "mystical", "ancient", "powerful", "ethereal", "wise",
    "magical", "enchanted", "legendary", "divine", "mythical",
    "arcane", "celestial", "mysterious", "noble", "fierce",
    "benevolent", "dark", "radiant", "shadowy", "transcendent"
  ],
  superhero: [
    "brave", "mighty", "swift", "vigilant", "noble",
    "fearless", "powerful", "heroic", "determined", "righteous",
    "protective", "valiant", "legendary", "unstoppable", "brilliant",
    "inspiring", "steadfast", "invincible", "champion", "guardian"
  ],
  supervillain: [
    "cunning", "menacing", "mysterious", "powerful", "calculating",
    "ruthless", "sinister", "dark", "chaotic", "enigmatic",
    "scheming", "formidable", "treacherous", "malevolent", "devious",
    "ambitious", "twisted", "notorious", "vengeful", "shadowy"
  ],
  droid: [
    "advanced", "efficient", "loyal", "intelligent", "precise",
    "helpful", "analytical", "protective", "tactical", "swift",
    "combat-ready", "stealth", "diplomatic", "engineering", "reconnaissance",
    "medical", "repair", "security", "navigation", "protocol"
  ],
  abstract: [
    "vibrant", "geometric", "fluid", "cosmic", "kaleidoscopic",
    "minimalist", "surreal", "psychedelic", "dynamic", "ethereal",
    "fractal", "gradient", "crystalline", "nebulous", "prismatic",
    "holographic", "mosaic", "radiant", "morphing", "luminous"
  ],
  nature: [
    "serene", "majestic", "wild", "tranquil", "powerful",
    "pristine", "vibrant", "ancient", "dramatic", "peaceful",
    "rugged", "lush", "mystical", "untamed", "breathtaking",
    "seasonal", "tropical", "arctic", "volcanic", "coastal"
  ]
};

export default function AvatarGenerator() {
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAvatar, setCurrentAvatar] = useState<string>("");
  const [generatedCount, setGeneratedCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("human");

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

  const generateCategoryAvatars = async () => {
    if (!selectedCategory) {
      toast.error("Please select a category");
      return;
    }

    setGenerating(true);
    setProgress(0);
    setGeneratedCount(0);
    const personalities = PERSONALITY_TEMPLATES[selectedCategory as keyof typeof PERSONALITY_TEMPLATES];
    const total = 20;
    let successCount = 0;

    try {
      for (let i = 0; i < total; i++) {
        const personality = personalities[i];
        const categoryName = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
        const avatarName = `${personality.charAt(0).toUpperCase() + personality.slice(1)} ${categoryName}`;
        
        // Create detailed prompts based on category
        let basePrompt = "";
        switch(selectedCategory) {
          case "human":
            basePrompt = `${personality} person, diverse ethnicity, professional portrait`;
            break;
          case "animal":
            basePrompt = `${personality} animal character, anthropomorphic style, expressive features`;
            break;
          case "fantasy":
            basePrompt = `${personality} fantasy creature, magical aura, enchanted appearance`;
            break;
          case "superhero":
            basePrompt = `${personality} superhero character, heroic pose, iconic costume`;
            break;
          case "supervillain":
            basePrompt = `${personality} villain character, intimidating presence, dramatic appearance`;
            break;
          case "droid":
            basePrompt = `${personality} robot or droid, futuristic design, mechanical details`;
            break;
          case "abstract":
            basePrompt = `${personality} abstract art, unique patterns, creative composition`;
            break;
          case "nature":
            basePrompt = `${personality} natural landscape, scenic view, beautiful environment`;
            break;
        }

        const fullPrompt = `${basePrompt}, high quality avatar portrait, professional digital art`;
        
        setCurrentAvatar(avatarName);
        console.log(`Generating ${i + 1}/${total}: ${avatarName}`);

        try {
          const { data, error } = await supabase.functions.invoke('generate-avatar', {
            body: { 
              prompt: fullPrompt, 
              name: avatarName, 
              category: selectedCategory 
            }
          });

          if (error) throw error;

          if (data?.imageUrl) {
            // Convert base64 to blob
            const base64Response = await fetch(data.imageUrl);
            const blob = await base64Response.blob();
            
            // Upload to storage
            const fileName = `${Date.now()}_${avatarName.toLowerCase().replace(/\s+/g, '_')}.png`;
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
                name: avatarName,
                image_url: publicUrl,
                category: selectedCategory,
              });

            if (dbError) throw dbError;

            successCount++;
            setGeneratedCount(successCount);
            console.log(`✅ Saved: ${avatarName}`);
          }
        } catch (err) {
          console.error(`Failed to generate ${avatarName}:`, err);
          toast.error(`Failed to generate ${avatarName}`);
        }

        setProgress(((i + 1) / total) * 100);
        
        // Add delay to avoid rate limiting
        if (i < total - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      toast.success(`Successfully generated ${successCount} out of ${total} ${selectedCategory} avatars!`);
    } catch (error) {
      console.error('Error generating category avatars:', error);
      toast.error('Failed to generate category avatars');
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
            <h2 className="text-xl font-semibold mb-2">Generate Category Avatars</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Generate 20 unique avatars with distinct personalities for a selected category.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
              ⚠️ This will take approximately 1 minute to complete. Each avatar is generated with a 2-second delay.
            </p>
            
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Select Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={generating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="human">Human (20 personalities)</SelectItem>
                    <SelectItem value="animal">Animal (20 personalities)</SelectItem>
                    <SelectItem value="fantasy">Fantasy (20 personalities)</SelectItem>
                    <SelectItem value="superhero">Superhero (20 personalities)</SelectItem>
                    <SelectItem value="supervillain">Supervillain (20 personalities)</SelectItem>
                    <SelectItem value="droid">Droid (20 personalities)</SelectItem>
                    <SelectItem value="abstract">Abstract (20 styles)</SelectItem>
                    <SelectItem value="nature">Nature (20 scenes)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={generateCategoryAvatars}
                disabled={generating || !selectedCategory}
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
                    Generate 20 Avatars
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Generate Full Default Library</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Generate 100 diverse, fun avatars across 8 distinct categories for users to choose from.
              This includes humans, superheroes, supervillains, animals, fantasy creatures, droids, abstract art, and nature scenes.
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-6">
              ⚠️ This will take approximately 4-5 minutes to complete. Each avatar is generated individually
              with a 2-second delay to respect rate limits.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">100</div>
              <div className="text-sm text-muted-foreground">Total Avatars</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">13</div>
              <div className="text-sm text-muted-foreground">Animals</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">13</div>
              <div className="text-sm text-muted-foreground">Fantasy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">13</div>
              <div className="text-sm text-muted-foreground">Humans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">12</div>
              <div className="text-sm text-muted-foreground">Superheroes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-600">12</div>
              <div className="text-sm text-muted-foreground">Supervillains</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">12</div>
              <div className="text-sm text-muted-foreground">Droids</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">12</div>
              <div className="text-sm text-muted-foreground">Abstract</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">13</div>
              <div className="text-sm text-muted-foreground">Nature</div>
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
                Generate 100 Avatar Library
              </>
            )}
          </Button>

          {generating && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Generating {currentAvatar}...</span>
                <span className="font-medium">{generatedCount} / 100</span>
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
          Showing 10 of 100 avatars that will be generated
        </p>
      </Card>
    </div>
  );
}
