const KIRIMDEV_API_KEY = process.env.KIRIMDEV_API_KEY;
const KIRIMDEV_PHONE_NUMBER_ID = process.env.KIRIMDEV_PHONE_NUMBER_ID;
const KIRIMDEV_API_BASE = process.env.KIRIMDEV_API_BASE || "https://api.kirimdev.com";

export async function sendWhatsAppText(to: string, body: string) {
  if (!KIRIMDEV_API_KEY || !KIRIMDEV_PHONE_NUMBER_ID) {
    throw new Error("KIRIMDEV_API_KEY atau KIRIMDEV_PHONE_NUMBER_ID belum diatur");
  }

  const res = await fetch(`${KIRIMDEV_API_BASE}/v1/${KIRIMDEV_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KIRIMDEV_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KirimDev error ${res.status}: ${text}`);
  }

  return res.json();
}
