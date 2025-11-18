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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`🎨 Using Gemini 2.5 Flash Image model for: ${name} (${category})`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

    const startTime = Date.now();

    // Call Google Gemini API to generate image using gemini-2.5-flash-image
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid Gemini API key. Please check your configuration." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 403) {
        return new Response(
          JSON.stringify({ error: "API key doesn't have permission for image generation." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Gemini returns base64 encoded images in candidates[0].content.parts[0].inlineData.data
    const imageBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!imageBase64) {
      console.error("❌ No image data in response:", JSON.stringify(data));
      throw new Error("No image generated");
    }

    // Convert to data URL format
    const imageUrl = `data:image/png;base64,${imageBase64}`;

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ Successfully generated avatar: ${name} in ${elapsedTime}ms`);
    console.log(`📊 Image size: ~${Math.round(imageBase64.length / 1024)}KB`);

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
