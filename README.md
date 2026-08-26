# shqipebunjaku.com

Personal portfolio / résumé site for Shqipe Bunjaku. This README is the source of truth for what the project is, how it's structured, and where it's headed — update it whenever the project's scope or structure changes, not just when content changes.

## What this is

A single-page personal site (no framework, no build step) deployed via Netlify. Everything currently lives in one `index.html` file: HTML, CSS, and JS inline.

## Current structure

- `index.html` — the entire site (styles in a `<style>` block, page-switching logic in inline `<script>`)
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

## Conventions

- No build tools, package manager, or dependencies — plain HTML/CSS/JS by design
- Keep everything working by opening `index.html` directly in a browser (no dev server required)
- Content edits (copy, testimonials, certifications, etc.) and structural edits (new sections, new pages, added tooling) are both worth a line in this README's Changelog section below if they change *how the project works*, not just *what it says*

## Roadmap / future direction

_(Update this section as plans change — it should always reflect current intent, not history.)_

- [ ] TBD — add planned features/changes here as they're decided

## Changelog

Track structural or scope changes here (new tooling, new pages, deployment changes) — not routine copy edits.

- 2026-08-26 — Repo cloned locally; README created to track project scope and structure going forward.
