import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, name, category } = await req.json();
    
    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const HUGGING_FACE_ACCESS_TOKEN = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
    if (!HUGGING_FACE_ACCESS_TOKEN) {
      throw new Error("HUGGING_FACE_ACCESS_TOKEN is not configured");
    }

    console.log(`🎨 Using Hugging Face image generation for: ${name} (${category})`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

    const startTime = Date.now();

    // Use Hugging Face Inference SDK with FLUX.1-schnell model (router-based)
    const hf = new HfInference(HUGGING_FACE_ACCESS_TOKEN);

    let imageBlob: Blob;

    try {
      imageBlob = (await hf.textToImage({
        model: "black-forest-labs/FLUX.1-schnell",
        inputs: prompt,
      })) as unknown as Blob;
    } catch (hfError) {
      console.error("Hugging Face textToImage error:", hfError);
      throw new Error(
        hfError instanceof Error
          ? `Image generation failed: ${hfError.message}`
          : "Image generation failed: unknown Hugging Face error"
      );
    }

    // imageBlob is obtained from Hugging Face Inference SDK above
    // Convert the blob to a base64 string
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const imageUrl = `data:image/png;base64,${base64}`;

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ Successfully generated avatar: ${name} in ${elapsedTime}ms`);

    return new Response(
      JSON.stringify({ imageUrl, name, category }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("💥 Error in generate-avatar function:", error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
