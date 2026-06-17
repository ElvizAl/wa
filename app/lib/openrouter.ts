const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
const OPENROUTER_TIMEOUT_MS = Number(process.env.OPENROUTER_TIMEOUT_MS || 15000);

export async function askOpenRouter(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.trim() === "") {
    throw new Error("OPENROUTER_API_KEY belum diatur di environment variables (.env.local)");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "Toko Buah WhatsApp Bot",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 220,
    }),
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "Maaf, saya tidak mengerti.";
}
