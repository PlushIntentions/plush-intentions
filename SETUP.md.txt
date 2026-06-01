# Plush Intentions — Full-Stack Setup Guide

## Architecture Overview

Three fully integrated Next.js 14 portals sharing one Supabase backend:

| Portal | Purpose | URL (suggested) |
|--------|---------|-----------------|
| Customer / Onboarding | Technician application + account creation | apply.plushintentions.com |
| Technician | Work order management, job maps, live GPS | tech.plushintentions.com |
| Admin | Approve/deny techs, assign work orders, live ops map | admin.plushintentions.com |

---

## Step 1 — Supabase Project Setup

1. Go to https://supabase.com → New Project → Name: "plush-intentions"
2. Choose a region close to your users (e.g. US East)
3. Save your **Database Password** securely

### Run the Migration

In Supabase Dashboard → SQL Editor → paste the full contents of:
`supabase/migrations/001_initial_schema.sql`

Click **Run**. This creates all tables, functions, triggers, and RLS policies.

### Get Your Keys

Dashboard → Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon/public key

### Enable Realtime

Dashboard → Database → Replication → enable for:
- `work_orders`
- `technicians`
- `notifications`
- `work_order_history`

---

## Step 2 — Mapbox Setup

1. Go to https://mapbox.com → Create free account
2. Dashboard → Tokens → Create a token
3. Allowed URLs: add your three Vercel domain URLs
4. Copy the token → this is your `NEXT_PUBLIC_MAPBOX_TOKEN`

---

## Step 3 — GitHub Repository Setup

### Option A: Monorepo (recommended)

```bash
git init plush-intentions
cd plush-intentions
# Copy all files into this directory
git add .
git commit -m "feat: initial Plush Intentions full-stack portal"
git remote add origin https://github.com/YOUR_USERNAME/plush-intentions.git
git push -u origin main
```

### Option B: Three Separate Repos

Create three repos:
- plush-intentions-customer
- plush-intentions-technician
- plush-intentions-admin

Each maps to its `apps/` subdirectory.

---

## Step 4 — Vercel Deployment

Deploy each portal as a separate Vercel project, pointed at the same Supabase instance.

### Customer Portal (apply.plushintentions.com)

1. Vercel Dashboard → Add New Project → Import `apps/customer`
2. Framework: Next.js (auto-detected)
3. Root Directory: `apps/customer`
4. Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
   NEXT_PUBLIC_MAPBOX_TOKEN      = pk.your-token
   ```
5. Deploy → Assign custom domain: `apply.plushintentions.com`

### Technician Portal (tech.plushintentions.com)

Same process → Root Directory: `apps/technician`
Domain: `tech.plushintentions.com`

### Admin Portal (admin.plushintentions.com)

Same process → Root Directory: `apps/admin`
Domain: `admin.plushintentions.com`

---

## Step 5 — Create Your First Admin Account

1. In Supabase → Authentication → Users → "Invite User"
2. Use your admin email address
3. After the user confirms their email and sets a password, run this SQL:

```sql
UPDATE profiles
SET role = 'admin', full_name = 'Your Name'
WHERE id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
```

4. Sign in at `admin.plushintentions.com/auth/login`

---

## Step 6 — Supabase Storage (for work order photos)

1. Dashboard → Storage → Create bucket: `work-order-photos`
2. Set to: **Public**
3. Add policy: Allow authenticated users to upload to `work-order-photos/*`

---

## Work Order Number Convention

Work Order Numbers are entered manually by the admin when creating a work order.

**Recommended format:** `WO-XXXX` (e.g. WO-1001, WO-1042, WO-2891)

The `wo_number` column has a `UNIQUE` constraint — the system will reject duplicates.

---

## How Everything Works Together

### Onboarding Flow (Customer Portal)
1. Applicant fills 4-step form (Account → Address → Experience → Review)
2. On submit: Supabase auth account created + `create_pending_technician()` DB function called
3. Function: inserts technician row with status = 'pending', notifies all admins
4. Applicant sees success screen

### Admin Review Flow
1. Admin sees notification badge + pending count on dashboard
2. Opens technician profile → reviews all details
3. Clicks **Approve** or **Deny**
4. Technician is automatically notified via the notifications table
5. Supabase Realtime propagates the status change instantly

### Work Order Lifecycle
1. Admin creates work order with a manually entered WO number (e.g. WO-1042)
2. Optional: assign tech immediately, or assign later
3. Address auto-geocoded to lat/lng via Mapbox Geocoding API
4. Assigned tech sees notification → work order appears in their portal
5. Tech starts job → status moves to `in_progress`
6. Tech completes → adds notes + final cost → status: `completed`
7. Admin sees completion in real time on dashboard + map

### Live Map (Admin)
- Online technicians appear as green pulsing dots (GPS from tech app)
- Active job sites appear as purple pins
- Individual work order view shows BOTH: the job pin + tech location pin with a dashed route line
- Auto-refreshes every 30 seconds + Supabase Realtime for instant updates

### Technician GPS Sharing
- Tech clicks "Go Online" toggle in sidebar
- Browser Geolocation API begins `watchPosition()` with high accuracy
- Location updates are written to `technicians.current_lat/lng` every GPS tick
- When tech goes offline or signs out: location sharing stops, `is_online = false`

---

## Local Development

```bash
# Install dependencies for all apps
cd apps/customer && npm install
cd ../technician && npm install
cd ../admin && npm install

# Copy .env.example to .env.local in each app directory
# Fill in your Supabase and Mapbox keys

# Run all three portals simultaneously
# Terminal 1:
cd apps/customer && npm run dev      # http://localhost:3000

# Terminal 2:
cd apps/technician && npm run dev    # http://localhost:3001

# Terminal 3:
cd apps/admin && npm run dev         # http://localhost:3002
```
