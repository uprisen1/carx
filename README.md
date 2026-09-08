# Car Marketplace Kenya — v1 (mid-size scope)

A Next.js 14 (App Router) + Supabase marketplace for second-hand cars in Kenya,
with private-seller and dealer accounts, listings, and buyer-seller messaging.
M-Pesa payments are intentionally left out of this version.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Create a Supabase project at https://supabase.com, then copy `.env.example`
   to `.env.local` and fill in your project URL and keys from
   Project Settings → API.
3. Push the database schema:
   ```
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   (Or paste the contents of `supabase/migrations/0001_init_schema.sql`
   directly into the Supabase SQL editor.)
4. Create a public Storage bucket named `listing-images` in the Supabase
   dashboard for car photo uploads.
5. Run the dev server:
   ```
   npm run dev
   ```

## Where things live (exact paths — several files share names across folders)

- Database schema: `supabase/migrations/0001_init_schema.sql`
- Supabase clients:
  - Browser (Client Components): `lib/supabase/client.ts`
  - Server (Server Components/Actions): `lib/supabase/server.ts`
  - Shared TypeScript types: `lib/supabase/types.ts`
- Auth session refresh: `middleware.ts` (project root)
- Pages (App Router — each `page.tsx` is scoped to its own folder):
  - Homepage: `app/page.tsx`
  - Search/browse: `app/listings/page.tsx`
  - Single car detail: `app/listings/[id]/page.tsx`
  - Dealer storefront: `app/dealers/[slug]/page.tsx`
  - Seller dashboard (listing table): `app/dashboard/page.tsx`
  - New listing form: `app/dashboard/listings/new/page.tsx`
  - Edit listing (placeholder — build similarly to the "new" form):
    `app/dashboard/listings/[id]/edit/page.tsx`
  - Login: `app/auth/login/page.tsx`
  - Signup: `app/auth/signup/page.tsx`
  - Messages inbox: `app/messages/page.tsx`
- Shared UI components: `components/ListingCard.tsx`, `components/SearchFilters.tsx`

## Not yet built (intentionally, given the agreed v1 scope)

- Admin approval queue UI for pending listings (schema already supports it
  via `listings.status`)
- Photo upload component (Supabase Storage bucket `listing-images`)
- Real-time message thread UI inside `app/messages/page.tsx`
- M-Pesa Daraja integration (deferred per your decision)
