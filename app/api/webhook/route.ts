import { NextRequest, NextResponse } from "next/server";
import { sendWhatsAppText } from "@/app/lib/kirimdev";
import { askOpenRouter } from "@/app/lib/openrouter";
import { getProductByName, getStockSummary } from "@/app/lib/products";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // KirimDev mengirimkan payload sesuai format WhatsApp Cloud API webhook
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const messages = value?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: true, message: "No messages" });
    }

    const message = messages[0];
    const from = message.from as string;
    const type = message.type as string;

    if (type !== "text" || !message.text?.body) {
      return NextResponse.json({ ok: true, message: "Unsupported message type" });
    }

    const userText = message.text.body as string;
    const reply = await generateReply(userText);

    await sendWhatsAppText(from, reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

async function generateReply(userText: string): Promise<string> {
  const lower = userText.toLowerCase();

  // Fast-path untuk cek stok spesifik
  const stokKeywords = ["stok", "stock", "tersedia", "ada", "sisa"];
  const isAskingStock = stokKeywords.some((k) => lower.includes(k));

  let productContext = "";

  if (isAskingStock) {
    // Coba cari nama produk di pesan user
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

  // Fallback ke AI OpenRouter
  productContext = `\n\nData stok toko buah (hanya gunakan jika relevan):\n${getStockSummary()}`;

  const systemPrompt = `Kamu adalah asisten virtual ramah dari *Toko Buah Segar*.\nBantu pelanggan dengan:\n- Menjawab pertanyaan tentang buah, harga, dan stok\n- Memberikan rekomendasi buah\n- Format jawaban singkat dan cocok untuk WhatsApp\n${productContext}\n\nJika ditanya stok spesifik, beritahu harga dan ketersediaannya. Jangan membuat data palsu. Jika tidak tahu, minta maaf dan sarankan hubungi admin.`;

  const aiReply = await askOpenRouter([
    { role: "system", content: systemPrompt },
    { role: "user", content: userText },
  ]);

  return aiReply;
}

function findProductInText(text: string) {
  for (const product of [
    { id: "apel", name: "Apel Fuji" },
    { id: "pisang", name: "Pisang Cavendish" },
    { id: "mangga", name: "Mangga Harum Manis" },
    { id: "jeruk", name: "Jeruk Mandarin" },
    { id: "anggur", name: "Anggur Hijau" },
    { id: "semangka", name: "Semangka Merah" },
    { id: "melon", name: "Melon Golden" },
    { id: "stroberi", name: "Stroberi" },
  ]) {
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
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Bisa sesuaikan verify token di .env jika KirimDev mendukung
  if (mode === "subscribe" && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ ok: true, message: "Webhook endpoint aktif" });
}
