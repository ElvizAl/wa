import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyKirimSignature(
  rawBody: string,
  header: string | null,
  secrets: string[],
  toleranceSeconds = 300
): boolean {
  if (!header || secrets.length === 0) return false;

  const parts = header.split(",").map((part) => part.trim());
  const timestamp = Number(parts.find((part) => part.startsWith("t="))?.slice(2));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${rawBody}`;

  return secrets.some((secret) => {
    const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

    return signatures.some((received) => {
      const expectedBuffer = Buffer.from(expected, "hex");
      const receivedBuffer = Buffer.from(received, "hex");

      return (
        expectedBuffer.length === receivedBuffer.length &&
        timingSafeEqual(expectedBuffer, receivedBuffer)
      );
    });
  });
}
