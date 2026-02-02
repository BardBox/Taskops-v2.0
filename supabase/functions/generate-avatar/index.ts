
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const { prompt, name, category, style = 'vector' } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    // --- REALISTIC GENERATION (Hugging Face) ---
    if (style === 'realistic') {
      const apiKey = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
      if (!apiKey) {
        throw new Error("Hugging Face API Key is not configured on the server. Please set HUGGING_FACE_ACCESS_TOKEN secret.");
      }

      console.log(`🎨 Generating Avatar (Hugging Face / FLUX.1-schnell) for: ${name} (${category})`);
      const startTime = Date.now();
      const model = "black-forest-labs/FLUX.1-schnell"; // Fast, high quality

      try {
        const response = await fetch(
          `https://router.huggingface.co/hf-inference/models/${model}`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "x-use-cache": "false"
            },
            body: JSON.stringify({
              inputs: `avatar of ${prompt}, high quality, realistic, detailed, centered, plain background, 8k resolution, trending on artstation`,
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`HF API Error (${response.status}): ${errText}`);
        }

        // HF returns a binary blob (image/jpeg usually)
        const imageBlob = await response.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const mimeType = imageBlob.type || "image/jpeg";
        const imageUrl = `data:${mimeType};base64,${base64Image}`;

        const elapsedTime = Date.now() - startTime;
        console.log(`✅ Successfully generated Realistic avatar in ${elapsedTime}ms`);

        return new Response(
          JSON.stringify({ imageUrl, name, category, style }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      } catch (err: any) {
        console.error("HF Generation Failed:", err);
        throw new Error(`Realistic generation failed: ${err.message}`);
      }
    }

    // --- VECTOR GENERATION (Gemini) ---
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    console.log(`🎨 Generating Avatar (Gemini 2.0) for: ${name} (${category})`);
    const startTime = Date.now();

    // Use Gemini 2.0 Flash (Fastest, latest)
    // Fallback to experimental if needed
    const models = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-2.0-flash-exp"];
    let svgCode = null;
    const errorLog: string[] = [];

    for (const model of models) {
      console.log(`Trying model: ${model}...`);
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Generate a simple, cute, flat-design SVG code for an avatar described as: "${prompt}". 
                  Do not include markdown backticks. Just return the raw <svg>...</svg> code. 
                  Ensure it has a square viewBox (e.g. 0 0 100 100) and vibrant colors.`
                }]
              }]
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          const msg = `${model} failed (${response.status}): ${errText.substring(0, 100)}`;
          console.warn(msg);
          errorLog.push(msg);
          continue;
        }

        const data = await response.json();
        const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (candidate && candidate.includes("<svg")) {
          svgCode = candidate;
          console.log(`✅ Success with model: ${model}`);
          break;
        }

      } catch (err: any) {
        console.warn(`Error with model ${model}:`, err);
        errorLog.push(`${model} exception: ${err.message}`);
      }
    }

    if (!svgCode) {
      console.error("All models failed.");
      throw new Error(`All models failed. Details: [${errorLog.join(" | ")}]`);
    }

    // Clean up SVG code (remove markdown if present)
    const cleanSvg = svgCode.replace(/```xml/g, '').replace(/```svg/g, '').replace(/```/g, '').trim();

    // Convert SVG to Base64 (Unicode safe)
    const base64Image = btoa(unescape(encodeURIComponent(cleanSvg)));
    const imageUrl = `data:image/svg+xml;base64,${base64Image}`;

    const elapsedTime = Date.now() - startTime;
    console.log(`✅ Successfully generated SVG avatar in ${elapsedTime}ms`);

    return new Response(
      JSON.stringify({ imageUrl, name, category, style }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("💥 Error in generate-avatar function:", error);

    return new Response(
      JSON.stringify({
        error: true,
        details: error instanceof Error ? `Crash: ${error.message}` : "Unknown System Error"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

