export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://williamguesby.github.io",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers
      });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    if (url.pathname !== "/api") {
      return json({
        status: "L'Oreal Worker is running"
      });
    }

    if (request.method === "GET") {
      return json({
        status: "API is running",
        apiKeyConfigured: Boolean(env.OPENAI_API_KEY)
      });
    }

    if (request.method !== "POST") {
      return json({
        error: "Method not allowed."
      }, 405);
    }

    try {
      if (!env.OPENAI_API_KEY) {
        return json({
          error: "OpenAI API key is missing."
        }, 500);
      }

      const { message, products } = await request.json();

      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 2000
      ) {
        return json({
          error: "Invalid message."
        }, 400);
      }

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a friendly L'Oreal beauty advisor. Create personalized beauty routines using the selected products. Explain the correct order, frequency, benefits, and application instructions. Do not invent product ingredients or medical claims."
              },
              {
                role: "user",
                content: `Selected products:
${JSON.stringify(products || []).slice(0, 6000)}

User request:
${message}`
              }
            ],
            max_tokens: 700
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return json({
          error: `OpenAI request failed (HTTP ${response.status}).`
        }, 502);
      }

      const reply = data.choices?.[0]?.message?.content;

      if (!reply) {
        return json({
          error: "OpenAI returned an empty response."
        }, 502);
      }

      return json({ reply });

    } catch (error) {
      console.error(error);

      return json({
        error: "Unable to generate a routine."
      }, 500);
    }
  }
};
