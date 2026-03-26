# SPL-SOL Backlog

Items are grouped by area. Add new items at the bottom of the relevant section.

---

## Auth

*All items done — 35a150a*

---

## Dashboard

*All items done — 35a150a*

---

## DB / Data Quality

*All items done — 35a150a (migration 0009)*

---

## Question Generation Pipeline

| # | Item | Notes |
|---|------|-------|
| QG-1 | Admin page (`/admin/generate`) — trigger generation, preview, approve/reject per question in browser UI | |
| QG-2 | Parent difficulty control — setting to cap difficulty level per child per subject | |
| QG-3 | VDOE released items scraper — parse actual released SOL test PDFs as a premium question source | |

---

## Accommodations

| # | Item | Notes |
|---|------|-------|
| AC-1 | Handle `extended_time` accommodation | Flag is stored in DB but never read. No per-question timer exists yet. Needs: timer UI in practice session + multiplier applied when accommodation is set. |

---

## Practice Session

| # | Item | Notes |
|---|------|-------|
| PS-1 | Image support for questions | Show a simple image alongside a question when relevant (e.g. geometry shapes, fraction diagrams, reading passages with illustrations). Needs: `image_url` or `image_data` field on the `questions` table, image rendering in the practice session UI, and generation pipeline support (either AI-generated SVGs or a curated asset library). |
