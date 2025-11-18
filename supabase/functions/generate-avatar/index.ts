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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`🎨 Using Lovable AI Gemini 2.5 Flash Image model for: ${name} (${category})`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

    const startTime = Date.now();

    // Call Lovable AI gateway using Gemini 2.5 Flash Image model
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Lovable AI image API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Avatar generation is temporarily rate-limited. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Avatar generation is not authorized. Please contact support." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: "Avatar generation is currently unavailable for this project." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Lovable AI image API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Lovable AI returns data URL for the generated image at choices[0].message.images[0].image_url.url
    const imageUrl: string | undefined =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("❌ No image URL in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

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
