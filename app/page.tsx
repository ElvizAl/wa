"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const webhookUrl =
    typeof window === "undefined" ? "/api/webhook" : `${window.location.origin}/api/webhook`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setReply("");

    try {
      const res = await fetch("/api/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      setReply(data.reply || data.error || "Tidak ada balasan");
    } catch (err) {
      setReply(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-orange-50 p-6">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-bold text-green-700">🍎 Toko Buah Chatbot</h1>
        <p className="mb-6 text-gray-600">Asisten virtual WhatsApp berbasis OpenRouter + KirimDev</p>

        <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <p className="font-semibold">Webhook URL untuk KirimDev:</p>
          <code className="mt-1 block rounded bg-white p-2 text-xs" suppressHydrationWarning>
            {webhookUrl}
          </code>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tes pesan pelanggan</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contoh: cek stok apel"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Memproses..." : "Kirim Pesan Uji Coba"}
          </button>
        </form>

        {reply && (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-2 text-sm font-semibold text-gray-700">Balasan Chatbot:</p>
            <pre className="whitespace-pre-wrap text-gray-800">{reply}</pre>
          </div>
        )}

        <div className="mt-8 border-t pt-6 text-sm text-gray-500">
          <p className="font-semibold text-gray-700">Cara pakai:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Isi <code>.env.local</code> dengan OpenRouter API Key dan KirimDev credentials.</li>
            <li>Jalankan <code>npm run dev</code>, lalu buka tunnel HTTPS seperti ngrok atau Cloudflare Tunnel.</li>
            <li>Daftarkan URL publik <code>https://domain-kamu/api/webhook</code> di webhook subscription KirimDev.</li>
            <li>Kirim chat ke nomor WhatsApp yang sudah terhubung di KirimDev.</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
