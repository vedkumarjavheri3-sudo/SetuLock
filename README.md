# Digi SetuSeva V1

**Document Wallet · Operator Portal · Encrypted Storage**

A secure, operator-driven platform for rural Maharashtra citizens. Operators at Seva Kendras manage families, upload encrypted documents, track scheme applications, and send email notifications.

## Architecture

```
SetuLock/
├── setulock-backend/          # Node.js + Express API
│   ├── src/routes/            # 8 API route files
│   ├── src/middleware/        # Auth, encryption, session check
│   ├── src/cron/              # ERASE + expiry cron jobs
│   ├── src/utils/             # Notification service
│   └── supabase-schema-v1.sql # Database schema
│
└── setulock-operator-portal/  # React + TypeScript + Vite
    └── src/pages/             # Login, Dashboard, FamilyDetail
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React + TypeScript + Vite |
| **Backend** | Node.js + Express |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage (encrypted) |
| **Encryption** | AES-256-CBC (per-family keys) |
| **Email** | Nodemailer + Gmail SMTP |

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/YOUR_USERNAME/SetuLock.git
cd SetuLock

# Backend
cd setulock-backend
npm install
cp .env.example .env   # Edit with your Supabase & SMTP credentials

# Frontend
cd ../setulock-operator-portal
npm install
```

### 2. Set up Supabase
- Create a project at [supabase.com](https://supabase.com)
- Run `supabase-schema-v1.sql` in the SQL Editor
- Create a Storage bucket named `secure_documents` (private)
- Copy your Project URL and Service Role Key to `.env`

### 3. Run
```bash
# Terminal 1 — Backend (port 3000)
cd setulock-backend && node server.js

# Terminal 2 — Frontend (port 5173)
cd setulock-operator-portal && npm run dev
```

Open **http://localhost:5173** → Register as an operator → Start managing families!

## Features

- 🔐 **AES-256 Encryption** — All documents encrypted at rest
- 📷 **Document Scanner** — Camera capture with 3 enhancement modes
- 📧 **Email Notifications** — 10 templates for key events
- ⏰ **Cron Jobs** — ERASE at 2AM, expiry alerts at 9AM IST
- 🛡️ **Session Management** — Auto-expiry enforcement
- 📊 **Dashboard** — Real-time stats and recent activity
- 🗑️ **GDPR/DPDP Compliance** — ERASE command with 30-day grace period

## Environment Variables

See `.env.example` for all required config.

## License

MIT
