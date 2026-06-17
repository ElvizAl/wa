import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/app/lib/kirimdev";
import { askOpenRouter } from "@/app/lib/openrouter";
import { getProductByName, getStockSummary, products } from "@/app/lib/products";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[Webhook] Received payload:", JSON.stringify(body, null, 2));

    // KirimDev mengirimkan payload sesuai format WhatsApp Cloud API webhook
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    // Abaikan status updates dan event non-message
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: true, message: "No messages to process" });
    }

    const message = messages[0];
    const from = message.from as string;
    const type = message.type as string;

    if (!from) {
      return NextResponse.json({ ok: true, message: "No sender" });
    }

    if (type !== "text" || !message.text?.body) {
      console.log(`[Webhook] Ignored message type: ${type}`);
      return NextResponse.json({ ok: true, message: "Unsupported message type" });
    }

    const userText = message.text.body as string;
    console.log(`[Webhook] Message from ${from}: ${userText}`);

    const reply = await generateReply(userText);
    console.log(`[Webhook] Reply: ${reply}`);

    await sendWhatsAppText(from, reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
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
  ]);

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

// Untuk verifikasi webhook KirimDev (jika diperlukan)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: true, message: "Webhook endpoint aktif" });
}
