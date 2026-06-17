const KIRIMDEV_API_KEY = process.env.KIRIMDEV_API_KEY;
const KIRIMDEV_PHONE_NUMBER_ID = process.env.KIRIMDEV_PHONE_NUMBER_ID;
const KIRIMDEV_API_BASE = process.env.KIRIMDEV_API_BASE || "https://api.kirimdev.com";

export async function sendWhatsAppText(to: string, body: string, phoneNumberId?: string) {
  const senderId = phoneNumberId || KIRIMDEV_PHONE_NUMBER_ID;

  if (!KIRIMDEV_API_KEY || !senderId) {
    throw new Error("KIRIMDEV_API_KEY atau phone_number_id belum diatur");
  }

  const res = await fetch(`${KIRIMDEV_API_BASE}/v1/${senderId}/messages`, {
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
