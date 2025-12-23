
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("🤖 Generating creative name for prompt:", prompt);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a creative naming assistant. Generate concise, professional character names based on descriptions. Names should be 2-3 words maximum, capture the character's essence, and sound memorable."
          },
          {
            role: "user",
            content: `Based on this character description: "${prompt}", generate a creative and fitting character name. Examples: "Golden Drake", "Crimson Guardian", "Friendly Scholar", "Azure Warrior", "Mystic Sage", "Tech Wizard"`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_name",
              description: "Generate a creative character name",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "A creative 2-3 word character name"
                  }
                },
                required: ["name"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_name" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No name generated from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);
    const generatedName = result.name;

    console.log("✅ Generated creative name:", generatedName);

    return new Response(
      JSON.stringify({ name: generatedName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating avatar name:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
