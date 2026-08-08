# Child Missing Alert (CMA)

Hackathon codebase. Split into two real "codebases" as requested:

- **`frontend/`** — React app (report flow, dashboard, sightings, authority view)
- **`database/`** — Supabase (Postgres) schema + Row Level Security policies

## Why there's no separate `backend/` folder

Supabase is your backend: it gives you a real Postgres database, authentication, and
file storage, all reachable directly from the React app, with access rules enforced
by the database itself (Row Level Security policies) rather than a hand-written
server. If a mentor asks "where's your backend," the answer is: "Supabase is our
backend-as-a-service, and our real backend logic — the safeguards — are written
declaratively as SQL policies in `database/supabase-schema.sql`."

(We started on Firebase, but Firebase now requires a linked billing card to create
any Firestore database — even on the free tier — which wasn't an option. Supabase's
free tier needs no card, so we switched. Same architecture, same safeguards, just a
different provider.)

## Setup (do this first, ~15 minutes)

1. Go to **https://supabase.com** → sign up (GitHub login is fastest, no card needed)
2. Click **"New project"**
   - Name it anything, e.g. `cma-hackathon`
   - Set a database password (save it somewhere, you likely won't need it again)
   - Pick a region close to you (e.g. Mumbai / South Asia)
   - Click **Create new project** and wait ~1-2 minutes for it to provision
3. **Run the schema**: left sidebar → **SQL Editor** → **New query** → paste the
   entire contents of `database/supabase-schema.sql` → click **Run**
4. **Create the storage bucket**: left sidebar → **Storage** → **New bucket** →
   name it exactly `case-photos` → toggle **Public bucket** ON → **Create bucket**
   - Then go back to **SQL Editor** and run the two storage policy statements that
     are commented out at the bottom of `supabase-schema.sql`
5. **Get your API keys**: left sidebar → **Project Settings** (gear icon) → **API**
   - Copy the **Project URL** and the **anon public** key
6. Paste both into `frontend/src/lib/supabaseClient.js` (marked with `TODO`)
7. (Optional but recommended for the demo) left sidebar → **Authentication** →
   **Providers** → **Email** → turn OFF "Confirm email" so test signups work
   instantly without needing to click an email link

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

## Data model

See `database/supabase-schema.sql` — this is your "database codebase," equivalent
to a SQL schema file, plus all the Row Level Security policies that implement the
safeguards from the pitch (pending → approved flow, role-based visibility, etc).

## Mapping back to the pitch

| Pitch feature | Where it lives in code |
|---|---|
| Verified reporting | `frontend/src/pages/ReportForm.jsx` + Supabase Auth |
| Pending → Approved flow | `status` column on `cases`, enforced by RLS policies + a trigger in `supabase-schema.sql` |
| Public vs authority visibility | RLS `select` policy on `cases` + conditional UI in `Dashboard.jsx` / `AuthorityDashboard.jsx` |
| Sightings | `frontend/src/pages/CaseDetail.jsx`, `sightings` table |
| Authority dashboard | `frontend/src/pages/AuthorityDashboard.jsx`, role-gated |
| FIR / police record link | `fir_number`, `police_station`, `district` columns on `cases`, optional at report time |

## Making a test account an "authority"

Since role can't be self-assigned (enforced by RLS), to demo the authority flow:
1. Sign up a normal test account through the app
2. In Supabase Dashboard → **Table Editor** → `profiles` table
3. Find that row, manually set `role` to `authority` and `verified` to `true`
4. Log out and back in on the app — you'll now see the Authority Dashboard link
