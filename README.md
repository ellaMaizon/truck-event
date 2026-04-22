# 🚚 Truck Event Billboard

> An interactive event app where attendees scan a QR code, take a selfie, and appear live on a large billboard screen.

---

## ✨ How It Works

```
Attendee 📱                  Operator 🖥️
   │                              │
   │  1. Scan QR code (/qr)       │
   │  2. Enter name + take photo  │
   │  3. Upload to Supabase       │
   │                              │  4. Detected via Realtime
   │                              │  5. Appears on billboard as an animated ball!
   └──────────────────────────────┘
```

---

## 🖼️ Pages

| Route | Description |
|-------|-------------|
| `/` | Main entry page |
| `/qr` | QR code display screen (for operators) |
| `/screen` | Billboard display screen (for large monitors) |

---

## 🛠️ Tech Stack

- **Framework** — [Next.js 15](https://nextjs.org) (App Router)
- **Styling** — Tailwind CSS
- **Database & Realtime** — [Supabase](https://supabase.com) (PostgreSQL + Realtime)
- **Tunnel** — ngrok (auto-detects HTTPS URL for external access)
- **Language** — TypeScript

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env.local` file and fill in the values:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Create the Supabase table

Run the following query in the Supabase SQL Editor:

```sql
create table photo_entries (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  photo_url text not null,
  created_at timestamp with time zone default now()
);
```

### 4. Start the development server

```bash
npm run dev
```

### 5. (Optional) Expose publicly with ngrok

```bash
ngrok http 3000
```

When ngrok is running, the `/qr` page will automatically display the HTTPS tunnel URL as a QR code.

---

## 📁 Project Structure

```
app/
├── page.tsx                  # Main page
├── qr/page.tsx               # QR code display (operator view)
├── screen/page.tsx           # Billboard screen (display view)
├── api/
│   ├── tunnel-url/route.ts   # ngrok URL detection API
│   └── local-ip/route.ts     # Local IP lookup API
└── stylesheets/
    ├── globals.css
    └── screen.css            # Billboard-specific styles
lib/
└── supabase.ts               # Supabase client
public/
└── images/                   # Billboard background images etc.
```

---

## 🎮 How to Run the Event

1. Open `/screen` on a large monitor or projector as the billboard
2. Show `/qr` to attendees
3. Attendees scan the QR → enter their name → take a photo
4. Their photo pops up on the billboard as an animated ball in real time! 🎉
