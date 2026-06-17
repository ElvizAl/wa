import { NextRequest, NextResponse } from "next/server";

let lastPayload: unknown = null;
let lastReceivedAt: string | null = null;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    lastPayload = body;
    lastReceivedAt = new Date().toISOString();

    console.log("[KirimDev payload]", JSON.stringify(body, null, 2));

    return NextResponse.json({ ok: true, message: "Payload captured" });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    lastReceivedAt,
    lastPayload,
    hint: "Ganti URL webhook di KirimDev ke /api/webhook/debug untuk melihat payload, lalu cek endpoint GET ini.",
  });
}
