import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log(`🎨 Using Lovable AI image generation for: ${name} (${category})`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

    const startTime = Date.now();

    // Use OpenAI gpt-image-1 for image generation
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          n: 1,
          size: "1024x1024",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Image generation failed due to OpenAI billing or quota limits. Please check your OpenAI account.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`OpenAI Images API error: ${response.status}`);
    }

    const data = await response.json();
    const base64 = data?.data?.[0]?.b64_json;

    if (!base64) {
      throw new Error("No image returned from OpenAI");
    }

    const imageUrl = `data:image/png;base64,${base64}`;

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ Successfully generated avatar: ${name} in ${elapsedTime}ms`);

    return new Response(
      JSON.stringify({ imageUrl, name, category }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("💥 Error in generate-avatar function:", error);
    
    // Handle rate limiting
    if (error instanceof Error && error.message.includes("429")) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
