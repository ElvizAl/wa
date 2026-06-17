import { after, NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/app/lib/kirimdev";
import { verifyKirimSignature } from "@/app/lib/kirimdev-signature";
import { askOpenRouter } from "@/app/lib/openrouter";
import { getProductByName, getStockSummary, products } from "@/app/lib/products";

export const runtime = "nodejs";
export const maxDuration = 30;

type MetaTextMessage = {
  id?: string;
  from?: string;
  type?: string;
  text?: {
    body?: string;
  };
};

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: {
          phone_number_id?: string;
        };
        messages?: MetaTextMessage[];
      };
    }>;
  }>;
};

// Simple in-memory dedupe cache for X-Kirim-Event-Id.
// In production with multiple instances, use Redis or a database.
const seenEventIds = new Map<string, number>();
const DEDUPE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function isDuplicate(eventId: string | null): boolean {
  if (!eventId) return false;
  const now = Date.now();
  const firstSeen = seenEventIds.get(eventId);
  if (firstSeen && now - firstSeen < DEDUPE_TTL_MS) {
    return true;
  }
  seenEventIds.set(eventId, now);
  return false;
}

function getWebhookSecrets() {
  return [
    process.env.KIRIMDEV_WEBHOOK_SECRET,
    process.env.KIRIMDEV_WEBHOOK_SECRET_ROTATING,
  ].filter((secret): secret is string => Boolean(secret));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const eventId = req.headers.get("x-kirim-event-id");
    const eventType = req.headers.get("x-kirim-event");
    const source = req.headers.get("x-kirim-source");
    const signature = req.headers.get("x-kirim-signature");

    console.log("[Webhook] Received:", { eventId, eventType, source });

    const secrets = getWebhookSecrets();
    if (secrets.length > 0 && !verifyKirimSignature(rawBody, signature, secrets)) {
      console.warn("[Webhook] Invalid KirimDev signature");
      return NextResponse.json({ ok: false, error: "invalid-signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as MetaWebhookPayload;

    if (isDuplicate(eventId)) {
      console.log(`[Webhook] Duplicate event skipped: ${eventId}`);
      return NextResponse.json({ ok: true, message: "duplicate-ack" });
    }

    // We only handle inbound WhatsApp text messages for this bot.
    if (source === "meta" && eventType === "message.received") {
      return handleMetaMessage(body);
    }

    if (source === "meta" && eventType === "message.status") {
      console.log("[Webhook] Status update ignored");
      return NextResponse.json({ ok: true, message: "status-ignored" });
    }

    if (source === "kirim") {
      console.log(`[Webhook] Kirimdev-native event ignored: ${eventType}`);
      return NextResponse.json({ ok: true, message: "kirim-event-ignored" });
    }

    return NextResponse.json({ ok: true, message: "unknown-event-ignored" });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

function handleMetaMessage(body: MetaWebhookPayload) {
  const replies: Array<{
    from: string;
    userText: string;
    phoneNumberId?: string;
    inboundMessageId?: string;
  }> = [];

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;

      for (const message of value?.messages ?? []) {
        if (!message.from) {
          console.log("[Webhook] Ignored message without sender");
          continue;
        }

        if (message.type !== "text" || !message.text?.body) {
          console.log(`[Webhook] Ignored message type: ${message.type}`);
          continue;
        }

        console.log(`[Webhook] Message from ${message.from}: ${message.text.body}`);
        replies.push({
          from: message.from,
          userText: message.text.body,
          phoneNumberId,
          inboundMessageId: message.id,
        });
      }
    }
  }

  if (replies.length === 0) {
    return NextResponse.json({ ok: true, message: "No text messages to process" });
  }

  after(async () => {
    const results = await Promise.allSettled(
      replies.map((reply) =>
        processReply(reply.from, reply.userText, reply.phoneNumberId, reply.inboundMessageId)
      )
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[Webhook] Failed to send reply:", result.reason);
      }
    }
  });

  return NextResponse.json({ ok: true, message: "replies-queued", count: replies.length });
}

async function processReply(
  from: string,
  userText: string,
  phoneNumberId?: string,
  inboundMessageId?: string
) {
  const reply = await generateReply(userText);
  console.log(`[Webhook] Reply: ${reply}`);
  await sendWhatsAppText(from, reply, phoneNumberId, inboundMessageId);
}

async function generateReply(userText: string): Promise<string> {
  const lower = userText.toLowerCase();

  // Fast-path untuk cek stok spesifik
  const stokKeywords = ["stok", "stock", "tersedia", "ada", "sisa"];
  const isAskingStock = stokKeywords.some((k) => lower.includes(k));

  if (isAskingStock) {
    const product = findProductInText(userText);
    if (product) {
      if (product.stock > 0) {
        return `✅ ${product.name} tersedia!\n💰 Harga: Rp${product.price.toLocaleString("id-ID")}/${product.unit}\n📦 Stok: ${product.stock} ${product.unit}\n\nMau pesan? Balas: "pesan ${product.name} [jumlah]"`;
      } else {
        return `❌ Maaf, ${product.name} sedang kosong. Stok akan datang besok.`;
      }
    } else {
      return `🍎 Stok buah hari ini:\n\n${getStockSummary()}\n\nKetik "cek stok [nama buah]" untuk info detail.`;
    }
  }

  // Fallback ke AI OpenRouter dengan konteks stok
  const productContext = `\n\nData stok toko buah (hanya gunakan jika relevan):\n${getStockSummary()}`;

  const systemPrompt = `Kamu adalah asisten virtual ramah dari *Toko Buah Segar*.\nBantu pelanggan dengan:\n- Menjawab pertanyaan tentang buah, harga, dan stok\n- Memberikan rekomendasi buah\n- Format jawaban singkat dan cocok untuk WhatsApp\n${productContext}\n\nJika ditanya stok spesifik, beritahu harga dan ketersediaannya. Jangan membuat data palsu. Jika tidak tahu, minta maaf dan sarankan hubungi admin.`;

  const aiReply = await askOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ]).catch((error) => {
    console.error("[OpenRouter] Failed to generate reply:", error);
    return "Maaf, bot sedang agak lambat. Untuk cek stok, ketik: cek stok [nama buah].";
  });

  return aiReply;
}

function findProductInText(text: string) {
  for (const product of products) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes(product.name.toLowerCase()) || lowerText.includes(product.id)) {
      return getProductByName(product.name);
    }
  }
  return undefined;
}

// Health check / webhook verification endpoint
export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook endpoint aktif" });
}
