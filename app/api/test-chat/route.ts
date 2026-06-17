import { NextRequest, NextResponse } from "next/server";
import { askOpenRouter } from "@/app/lib/openrouter";
import { getStockSummary } from "@/app/lib/products";

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const productContext = `\n\nData stok toko buah (hanya gunakan jika relevan):\n${getStockSummary()}`;

    const systemPrompt = `Kamu adalah asisten virtual ramah dari *Toko Buah Segar*.\nBantu pelanggan dengan:\n- Menjawab pertanyaan tentang buah, harga, dan stok\n- Memberikan rekomendasi buah\n- Format jawaban singkat dan cocok untuk WhatsApp\n${productContext}\n\nJika ditanya stok spesifik, beritahu harga dan ketersediaannya. Jangan membuat data palsu. Jika tidak tahu, minta maaf dan sarankan hubungi admin.`;

    const reply = await askOpenRouter([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Test chat error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
