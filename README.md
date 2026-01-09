# Money Dashboard

Personal finance dashboard with Plaid integration for tracking accounts, transactions, and expenses.

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.local.example .env.local

# Start Postgres (requires Docker)
docker compose up -d

# Push database schema
bunx drizzle-kit push

# Start dev server
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

## Connect Real Bank Accounts

### 1. Get Plaid Credentials
1. Sign up at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Go to **Team Settings** → **Keys**
3. Copy your:
   - `client_id`
   - `sandbox` secret (for testing)
   - `production` secret (for real banks)

### 2. Configure Environment
Add to `.env.local`:
```bash
PLAID_CLIENT_ID=your_client_id_here
PLAID_SANDBOX_SECRET=your_sandbox_secret_here
PLAID_PRODUCTION_SECRET=your_production_secret_here
PLAID_ENV=production  # Use "production" for real banks, "sandbox" for test data
```

### 3. Connect Your Bank
- Click **"Connect Bank"** in the dashboard
- **Production mode**: Select your real bank (Chase, Bank of America, etc.)
- **Sandbox mode**: Use test bank "First Platypus Bank" with credentials `user_good`/`pass_good`

**Note**: Plaid Development mode (free, 100 bank connection limit) is sufficient for personal use. Apply for Production access at dashboard.plaid.com to remove limits.

## Stack

- Next.js 16
- Tailwind CSS 4
- Drizzle ORM + Postgres
- Plaid (banking)
