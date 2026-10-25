# Migration plan: Vercel → Cloudflare Workers (OpenNext)

**Date:** 2026-10-25
**App:** SOLPrep (`spl-sol`)
**Trigger:** Vercel paused the project on Fluid Active CPU usage (free-tier cap). Pivoting to a host without surprise usage-pauses.
**Target plan:** Cloudflare Workers **Free tier first**, upgrade to Workers Paid ($5/mo) only if CPU limits bite the admin AI-generation route.

## Why Cloudflare is viable for this app

The database, auth, and storage already live on **Supabase (external)**, so only the Next.js app moves. Compatibility audit of the codebase:

| Concern | Finding | Verdict |
|---|---|---|
| Direct Postgres (`pg`) | Only in `scripts/` (seed/import), never at runtime | OK — no Hyperdrive needed |
| Database / auth | All via `@supabase/ssr` + `supabase-js` (HTTP/fetch) | OK — native on Workers |
| Encryption (`lib/encryption`) | Web Crypto `crypto.subtle`, not `node:crypto` | OK — native on Workers |
| AI SDKs (Anthropic/Gemini/Resend) | Anthropic runtime path `lib/generation/generate-topic.ts`; rest in scripts. All fetch-based | OK — needs `nodejs_compat` |
| TTS route | Proxies `upstream.body` ReadableStream | OK — Workers stream natively |
| File uploads | Feedback uses Supabase signed URLs — upload bypasses the Worker | OK — no body-size limit issue |
| `export const runtime` | None in the app | OK — all default |
| Middleware | No `middleware.ts` tracked in git (only stale `.next` artifact) | OK — not a blocker |

### Open risks
1. **Next.js 16.2.1 support in `@opennextjs/cloudflare`.** Next 16 is new; adapter support is recent. Must be proven by a real build (Phase 0) before investing further.
2. **Free-tier CPU limits** on the admin AI-generation route. Mostly I/O wait (doesn't count as CPU), but if it trips, upgrade to Workers Paid ($5/mo) — still cheaper than Vercel Pro, no pause risk.

## Phases

### Phase 0 — De-risk (do first)
- Install `@opennextjs/cloudflare` + `wrangler` (dev deps).
- Run `npx opennextjs-cloudflare build` against Next 16.2.1.
- **Gate:** if the build fails on Next 16, stop and reassess (pin Next version or wait for adapter) before continuing.

### Phase 1 — Config scaffolding
- `wrangler.jsonc`: `nodejs_compat` flag, recent `compatibility_date`, Workers Assets binding, `main` → `.open-next/worker.js`.
- `open-next.config.ts`.
- R2 bucket binding for incremental/ISR cache (app uses `api/revalidate-counts` + `loading.tsx`).
- `cloudflare-env.d.ts` + npm scripts: `preview`, `deploy`, `cf-typegen`.

### Phase 2 — Env & secrets
Move to Workers (public → wrangler vars; secret → `wrangler secret put`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public)
- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `GOOGLE_GENERATIVE_AI_KEY`, `ENCRYPTION_SECRET` (secret)

### Phase 3 — Local preview & smoke test
`opennextjs-cloudflare preview`; exercise: auth login, practice session, one API route, TTS streaming, one revalidation path.

### Phase 4 — Deploy to workers.dev staging
Deploy, retest against real Supabase, add staging URL to Supabase Auth redirect allow-list.

### Phase 5 — Domain cutover & Vercel retirement
Point custom domain at the Worker, update Supabase Auth redirect/allow-list URLs, retire the Vercel project.

## Phase 0 results (2026-10-25) — PASSED

OpenNext build completed; Worker written to `.open-next/worker.js`. SOLPrep builds for Cloudflare.

Changes required to get there (all committed to the working tree):
1. **Next 16.2.1 → 16.4.2** (+ `eslint-config-next@16.4.2`). The adapter (`@opennextjs/cloudflare@1.20.12`) peer-requires `next >=15.5.28 <16 || >=16.4.1`; 16.2.1 sat in the unsupported gap. `next build` compiles cleanly on 16.4.2.
2. **tsconfig.json**: excluded test files + vitest config from the build type-check (`**/*.test.ts(x)`, `vitest.*`). `next build` type-check was failing on vitest globals (`describe`/`it`/`expect`) in test files — pre-existing, unrelated to Cloudflare, but blocks any production build. Vitest still runs the tests (own transform).
3. **esbuild dependency resolution**: `@opennextjs/aws` pins `esbuild@0.28.2` but `vite` wants `^0.27.0`, so npm hoisted neither and the adapter couldn't resolve esbuild. Fixed with `overrides.esbuild = "0.28.2"` + esbuild as a direct root devDependency (forces top-level placement). `@esbuild/win32-x64` binary installs via optional dep despite the blocked postinstall.

### Environment notes
- npm registry is routed through Microsoft CFS proxy (`https://packagefeedproxy.microsoft.io/npm/` in user `.npmrc`). Installs work; some postinstall scripts are blocked by an allow-scripts policy (did not break esbuild/workerd binaries).

### Risk flagged for Phase 3
- Middleware is `proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`). OpenNext warns **Node.js middleware support on Cloudflare is experimental**. The proxy is trivial (CSP nonce + headers; only Node-ism is `Buffer`, covered by `nodejs_compat`). **Mitigation:** swap `Buffer.from(x).toString('base64')` → `btoa(x)` to make it pure-Web and likely drop the experimental classification. Validate CSP nonce flow in local preview.

## Phase 3 results (2026-10-25) — core path validated

Local `workerd` preview (`opennextjs-cloudflare preview`, http://127.0.0.1:8787):
- Homepage `/` → 200, full SSR (~60KB), real `<title>`, served via OpenNext (`x-opennext: 1`).
- `proxy.ts` middleware works: CSP header set with valid base64 nonce (post `btoa` swap), nonces propagated into HTML. Only the known "experimental Node.js middleware" warning; no runtime errors.
- With real Supabase keys in `.dev.vars`: `/sol-practice/3` and `/login` → 200; `GET /api/questions?grade=3&subject=math` → 200 returning **10 real DB questions**. Confirms workerd → Supabase → DB → JSON.

Not yet exercised (need a real browser session or are admin-only): interactive auth login, POST mutations (sessions/answers), TTS streaming, `/api/revalidate-counts`. Best verified on the Phase 4 staging deploy via browser.

### Env var blocker classification (runtime usage in app/ + lib/)
- **MUST (blockers):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (used in 43 runtime files incl. homepage via `lib/supabase/marketing.ts`).
- **Semi (feature):** `ENCRYPTION_SECRET` — decrypts parents' saved TTS keys; MUST equal the current production value or saved keys break.
- **Non-blockers (fill later):** `RESEND_API_KEY` (email), `ANTHROPIC_API_KEY` (admin generation), `OPENAI_API_KEY` (admin story fallback), `REVALIDATE_SECRET` (one internal endpoint).
- **Not needed on Workers:** `GOOGLE_GENERATIVE_AI_KEY` (scripts only).

## Notes
- `scripts/` are Node CLI tools (run locally/CI), not deployed — no change needed.
- Keep Vercel project alive until Phase 5 completes for easy rollback.
- Minimal `wrangler.jsonc` + `open-next.config.ts` already scaffolded during Phase 0.
- Build artifacts: add `.open-next/` to `.gitignore`.
