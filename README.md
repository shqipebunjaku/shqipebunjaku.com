# shqipebunjaku.com

Personal portfolio / résumé site for Shqipe Bunjaku. This README is the source of truth for what the project is, how it's structured, and where it's headed — update it whenever the project's scope or structure changes, not just when content changes.

## What this is

A lightweight single-page personal site built with plain HTML, CSS, and JavaScript. Vite provides the local development/build workflow and safely injects the public Supabase browser configuration.

## Current structure

- `index.html` — page markup and asset entry points
- `assets/css/styles.css` — all site styling and responsive rules
- `assets/js/app.js` — page navigation and browser behavior
- `assets/js/supabase.js` — the shared, environment-configured Supabase client
- `admin/index.html` — protected post dashboard and rich-text editor at `/admin/`
- `assets/js/admin.js` / `assets/css/admin.css` — Google auth, post CRUD, image upload, and admin presentation
- `supabase/migrations/` — database schema, image bucket, and Row Level Security policies
- `netlify.toml` — production build and clean-URL rewrites
- `.env.example` — documented public environment variables (copy to `.env` locally)
- `package.json` / `pnpm-lock.yaml` — development and production build dependencies
- Client-side "pages" are `<div class="page" id="page-*">` sections toggled by a `goTo(name)` JS router — there is no real navigation/routing, no page reloads
- Fonts: Google Fonts (Playfair Display + Inter)
- Color theme: dark background, gold accent (`--gold: #C9A96E`)

### Pages / sections

| Page | id | Purpose |
|---|---|---|
| Home | `page-home` | Landing / hero intro |
| About me | `page-about` | Bio, client relationship philosophy |
| Resume | `page-resume` | Professional experience & certifications summary |
| Testimonials | `page-testimonials` | Client/colleague quotes |
| Writings | `page-writings` | Articles / written content |
| Certifications | `page-certifications` | Professional development / credentials |
| Contact | `page-contact` | Contact info / form |

## How it's deployed

Hosted on Netlify (repo history shows an "Initial commit via Netlify" commit — deploys are likely triggered by pushes to this repo).

## Local development

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in the public Supabase project URL and anon/publishable key.
3. Run `npm run dev` for local development.
4. Run `npm run build` to create the deployable `dist/` directory.

The Supabase client remains `null` until both variables are configured, so the site can still render before a backend is connected. Import the shared `supabase` export from `assets/js/supabase.js` in future data modules. Never put a Supabase service-role key in this frontend.

For Netlify, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the site environment, use `npm run build` as the build command, and publish `dist`.

## Supabase setup

1. Create a Supabase project and run `supabase/migrations/202608270001_create_posts.sql` in the SQL Editor (or apply it with the Supabase CLI).
2. In **Authentication → Providers → Google**, enable Google and add the OAuth client ID and secret from Google Cloud.
3. In Google Cloud, add the Supabase callback URL shown on that provider screen as an authorized redirect URI.
4. In **Authentication → URL Configuration**, set the production Site URL and add `http://localhost:5173/admin/` plus `https://shqipebunjaku.com/admin/` as redirect URLs.
5. Copy `.env.example` to `.env` and add the project URL and anon/publishable key. Add the same values in Netlify.

Only the Google identity `shqipeebunjakuu@gmail.com` is accepted by the admin application. Database and Storage Row Level Security repeat that email-and-provider check, so authorization does not rely on the browser UI. The account can create, edit, publish, unpublish, and delete all posts and upload public post images.

Public routes are `/`, `/about-me`, `/resume`, `/testimonials`, `/writings`, `/writings/:slug`, `/certifications`, `/contact`, `/privacy-policy`, `/terms-and-conditions`, and `/cookies-policy`. Netlify rewrites these routes to the public app while preserving their URL.

The public site supports dark, light, and system themes. The selected preference and cookie-banner choice are stored in browser local storage. No optional analytics or advertising cookies are currently enabled.

## Conventions

- Keep presentation in `assets/css`, behavior in `assets/js`, and page markup in `index.html`
- Use the shared Supabase client rather than creating clients in individual modules
- Enable Row Level Security and appropriate policies on every browser-accessible Supabase table
- Content edits (copy, testimonials, certifications, etc.) and structural edits (new sections, new pages, added tooling) are both worth a line in this README's Changelog section below if they change *how the project works*, not just *what it says*

## Roadmap / future direction

_(Update this section as plans change — it should always reflect current intent, not history.)_

- [ ] TBD — add planned features/changes here as they're decided

## Changelog

Track structural or scope changes here (new tooling, new pages, deployment changes) — not routine copy edits.

- 2026-08-26 — Repo cloned locally; README created to track project scope and structure going forward.
- 2026-08-27 — Split CSS and JavaScript out of `index.html`; added Vite and a shared environment-configured Supabase client.
- 2026-08-27 — Added clean public routes, public Supabase writings, and a Google-restricted publishing dashboard with rich-text editing and image uploads.
- 2026-08-27 — Added consistent site footers, legal policy routes, cookie consent controls, and persistent dark/light/system themes.
