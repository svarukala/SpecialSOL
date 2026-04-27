# Infrastructure Migration Options — Vercel + Supabase Alternatives

*Researched: March 2026. Verify pricing on official sites before committing.*

---

## Current Stack

| Layer | Service | Cost |
|-------|---------|------|
| Hosting | Vercel (Pro) | $20/mo + bandwidth overages |
| Database + Auth | Supabase | Free tier (500MB) or Pro $25/mo |
| AI APIs | Anthropic + Google | Usage-based, separate |

**Current scale**: Low traffic educational app. No cost emergency today.

**Migration trigger**: When monthly bill hits ~$75+/month.

---

## Why Costs Can Explode

- **Vercel**: Bandwidth overages at $40/100GB past 1TB. Serverless execution, edge middleware, and image optimization all metered separately. A site past ~1M pageviews can jump from $20/mo to $500+/mo.
- **Supabase**: Free tier caps at 500MB DB / 1GB storage / 2GB bandwidth. Usage-based overages (compute, storage, egress) surprise you at scale.

---

## Good News: Not Deeply Locked In

This app uses:
- ✅ Standard Next.js (no Vercel-specific APIs like Edge Config or AI Gateway)
- ✅ Standard Postgres (no Supabase-specific extensions)
- ⚠️ Supabase Auth — the one proprietary coupling (but migratable, see below)

---

## Migration Options

### Option A: Cloudflare Pages + Neon + Keep Supabase Auth
**Cost**: ~$5–10/month | **Effort**: Low (2–3 hours total)

- **Hosting** → Cloudflare Pages (free unlimited bandwidth — the biggest Vercel cost driver)
  - Uses `@opennextjs/cloudflare` adapter
  - Supports SSR, SSG, API routes, server actions
- **Database** → Neon (standard Postgres, scale-to-zero, generous free tier)
  - Migration: `pg_dump` from Supabase → restore to Neon → update connection string
- **Auth** → Keep Supabase Auth (free to 50K MAUs, handles parent/child/admin roles)

**Best first move** — fixes bandwidth costs immediately, keeps the hard auth stuff intact.

---

### Option B: Railway (All-in-One)
**Cost**: ~$10–20/month | **Effort**: Medium

- One platform: Next.js app + Postgres + background jobs
- Click "New → Database → Add PostgreSQL" — no config needed
- Auth via Better Auth library (stores sessions in Railway's own Postgres)
- Simpler billing, one dashboard
- No persistent free tier (one-time $5 trial credit)

---

### Option C: Coolify on Hetzner VPS (Long-term cheapest)
**Cost**: ~$15/month flat | **Effort**: High initially, then set-and-forget

- Hetzner CX22 (~$7/mo, 4GB RAM) runs Next.js + Postgres + Redis comfortably
- Coolify = open-source self-hosted Vercel dashboard (git-push deploys, auto-SSL, one-click DBs)
- **$15/month flat regardless of traffic** — no bandwidth metering, no per-seat fees
- Auth: self-host Appwrite, or use Better Auth with local Postgres

---

## Recommended Migration Order (Easiest → Hardest)

```
Step 1 — Move hosting → Cloudflare Pages        (2 hrs, fixes bandwidth costs)
Step 2 — Move database → Neon                   (30 min, pg_dump + restore)
Step 3 — Move auth → Better Auth                (2 days, last and hardest)
```

**Do Step 3 last.** The parent + child + admin role system with RLS is the most
work to migrate and the highest risk of introducing bugs.

---

## Auth Migration: Supabase Auth → Better Auth

### Key facts

- **No user re-signup required** — accounts are copied silently
- **No password resets** — Supabase uses bcrypt hashes; Better Auth supports bcrypt; hashes port directly
- **No broken foreign keys** — preserve existing Supabase UUIDs on import; all FK references stay intact
- **One-time re-login** — all sessions invalidated on cutover day; users log in once normally
- **OAuth users** (Google/GitHub) — must re-link once on first login after migration

### What the migration involves

```
1. Export from Supabase
   → Query auth.users via service role API
   → Get: id (UUID), email, encrypted_password (bcrypt), email_confirmed_at, metadata

2. Set up Better Auth tables in Neon
   → Better Auth migration creates: user, session, account tables

3. Import users (preserve UUIDs)
   INSERT INTO "user" (id, email, ...) VALUES ('<same-supabase-uuid>', ...)

4. Import password hashes
   INSERT INTO account (user_id, provider_id, password, ...)
   VALUES ('<user-id>', 'credential', '<bcrypt-hash-from-supabase>', ...)

5. Migrate role assignments (admin / parent / child)
   → Better Auth roles plugin: betterAuth({ plugins: [admin()] })
   → ~1–2 days of work to port the 3-tier role system

6. Rewrite RLS policies
   → Change: auth.uid()  →  current_setting('app.user_id')
   → Works with any auth system (standard Postgres pattern)

7. Test with shadow users → cutover → deploy
```

### Auth option comparison

| Option | Cost | Effort | Notes |
|--------|------|--------|-------|
| Keep Supabase Auth | $0 (to 50K MAUs) | None | Best default — free, handles roles, no migration |
| Better Auth | Free (library) | Medium | TypeScript-first, own your data, Neon integration |
| Clerk | $25/mo + $0.02/MAU | Low | Best DX, but expensive at scale with many parent accounts |
| Auth.js (NextAuth) | Free (library) | Medium | Standard Next.js choice, you own the data |

**Recommendation**: Keep Supabase Auth until you have a real reason to move it.
When you do move, use **Better Auth** — it's the 2026 standard for self-hosted auth with Next.js.

---

## Platform Comparison

| Platform | Dev Speed | Cost at Scale | Lock-in | Best For |
|----------|-----------|---------------|---------|----------|
| Vercel + Supabase | 🔥🔥🔥 | High | Medium | Early dev, fast iteration |
| Cloudflare + Neon | 🔥🔥🔥 | Very low | Low | Cost-optimised, keeps DX |
| Railway | 🔥🔥 | Predictable | Low | All-in-one simplicity |
| Coolify + Hetzner | 🔥🔥 | Lowest (~$15 flat) | None | Revenue-generating apps |

---

## VPS Providers (if going self-hosted)

| Provider | Entry Plan | Price | Specs |
|----------|-----------|-------|-------|
| Hetzner | CAX11 (ARM64) | ~$5.50/mo | 2GB RAM / 2 vCPU / 40GB |
| DigitalOcean | Basic Droplet | $4/mo | 512MB RAM / 1 vCPU / 10GB |
| Linode (Akamai) | Nanode 1GB | $5/mo | 1GB RAM / 1 vCPU / 25GB |
| Vultr | Regular | $2.50/mo | 0.5GB RAM / 10GB SSD |

**Best pick**: Hetzner CX22 (~$7/mo, 4GB RAM) — enough headroom to run Next.js + Postgres + Redis on one box.

---

## Architectural Rules to Follow Now (Prevents Lock-in Later)

1. **Don't use Supabase Realtime** — not currently used; don't start.
2. **Don't use `supabase.storage` for file uploads** — use Cloudflare R2 or Vercel Blob instead. Storage is the second-hardest migration after auth.
3. **Keep RLS policies documented** — `auth.uid()` patterns won't port directly; document them so you can re-implement in any Postgres host.
4. **Avoid Vercel-specific APIs** — no Edge Config, no AI Gateway, no Vercel-specific headers. Already clean.
5. **Standard Postgres only** — no Supabase extensions. Already clean.

---

## Email (Needed When Self-Hosting Auth)

Transactional email is required for "Verify Email" / "Reset Password" flows when you move off Supabase Auth.

| Service | Free Tier | Notes |
|---------|-----------|-------|
| Resend | 3,000 emails/mo | Best DX for Next.js, native Better Auth integration |
| Postmark | 100 emails/mo | Excellent deliverability |
| SendGrid | 100 emails/day | Well-established |
