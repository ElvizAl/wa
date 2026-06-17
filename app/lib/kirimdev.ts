const KIRIMDEV_API_KEY = process.env.KIRIMDEV_API_KEY;
const KIRIMDEV_PHONE_NUMBER_ID = process.env.KIRIMDEV_PHONE_NUMBER_ID;
const KIRIMDEV_API_BASE = process.env.KIRIMDEV_API_BASE || "https://api.kirimdev.com";

function formatWhatsAppNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("0")) return `+62${trimmed.slice(1)}`;
  return `+${trimmed}`;
}

export async function sendWhatsAppText(
  to: string,
  body: string,
  phoneNumberId?: string,
  replyToMessageId?: string
) {
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
      to: formatWhatsAppNumber(to),
      type: "text",
      ...(replyToMessageId ? { context: { message_id: replyToMessageId } } : {}),
      text: { body },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`KirimDev error ${res.status}: ${text}`);
  }

  return res.json();
}
