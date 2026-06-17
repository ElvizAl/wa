# Toko Buah WhatsApp AI Bot

Bot WhatsApp AI berbasis Next.js, OpenRouter, dan KirimDev. Aplikasi ini menerima webhook inbound dari KirimDev, membuat balasan AI, lalu mengirim pesan balik memakai nomor WhatsApp yang terhubung di KirimDev.

## Setup

1. Salin `.env.local.example` menjadi `.env.local`.
2. Isi variabel berikut:

```env
OPENROUTER_API_KEY="..."
OPENROUTER_MODEL="openai/gpt-4o-mini"

KIRIMDEV_API_KEY="..."
KIRIMDEV_PHONE_NUMBER_ID="..."
KIRIMDEV_API_BASE="https://api.kirimdev.com"
KIRIMDEV_WEBHOOK_SECRET="..."
KIRIMDEV_WEBHOOK_SECRET_ROTATING=""

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

3. Jalankan server:

```bash
npm run dev
```

4. Untuk menerima chat dari WhatsApp, buat URL publik HTTPS ke server lokal, misalnya dengan ngrok atau Cloudflare Tunnel.
5. Buat webhook subscription di KirimDev ke URL:

```text
https://domain-publik-kamu/api/webhook
```

Pilih minimal event:

```text
message.received
message.status
```

6. Simpan `initial_secret` dari response subscription ke `KIRIMDEV_WEBHOOK_SECRET`.
7. Kirim pesan WhatsApp ke nomor yang sudah terhubung di KirimDev.

## Endpoint

- `GET /api/webhook` health check.
- `POST /api/webhook` menerima event KirimDev.
- `POST /api/test-chat` mengetes balasan AI tanpa WhatsApp.
- `POST /api/webhook/debug` menangkap payload terakhir untuk debugging.

## Catatan keamanan

KirimDev menandatangani webhook dengan header `X-Kirim-Signature`. Jika `KIRIMDEV_WEBHOOK_SECRET` diisi, aplikasi akan menolak payload dengan signature yang tidak valid.
