# ohmpere.com

Website for Ohmpere: a static site (plain HTML, CSS and JavaScript, no build step) served by GitHub Pages at https://ohmpere.com.

## Files

| Path | What it is |
|---|---|
| `index.html` | The home page: hero, charge estimator, hub, hosts, drivers, roadmap, about, FAQ, contact |
| `privacy.html` | POPIA privacy notice |
| `404.html` | Page shown for broken links |
| `assets/css/site.css` | All styles. Brand colours are at the top as CSS variables |
| `assets/js/site.js` | Mobile menu, charge estimator maths, contact form |
| `assets/js/charger-map.js` | South African charger map (Open Charge Map data, Type 2 and CCS2 only) |
| `assets/js/config.js` | Site settings: the Open Charge Map API key goes here |
| `assets/img/brand/` | Logos from the Ohmpere brand package |
| `assets/img/icons/` | Favicons and app icons |
| `assets/img/og.png` | Preview image used when the link is shared |
| `CNAME` | Tells GitHub Pages to serve the site on ohmpere.com |

## Editing

Edit a file on github.com (pencil icon) or locally, commit to `main`, and the site updates within a minute or two.

- **Contact email**: the site uses `hello@ohmpere.com`. It appears in `index.html` (search for `hello@`), `privacy.html` and the `data-to` attribute on the contact form. Create that address (or an alias) in iCloud custom email domain settings, or change it everywhere.
- **Charge estimator assumptions** are constants at the top of the estimator block in `assets/js/site.js` (kWh per km, AC efficiency, DC average power). Keep the note under the estimator in `index.html` in step.
- **Photos** are free-licence Unsplash and Pexels images loaded from their CDNs, credited in the footer. Replace them with photos of real Ohmpere hubs once they exist.

## Fonts

Archivo from Google Fonts, using its width axis: extended (125%) for headings, normal width for body text.

## Domain

DNS for ohmpere.com is managed at Squarespace Domains. Website records:

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | charlieza.github.io |

Leave the iCloud Mail records (MX, TXT/SPF, DKIM) alone; they run email on the domain.

## Charger map

The map loads public charging sites in South Africa from the Open Charge Map API each time the page opens, and shows only Type 2 (AC) and CCS2 (DC) sites. It needs a free API key:

1. Sign in at https://openchargemap.org (any account works).
2. Go to My profile → API keys and create a key.
3. Paste it into `assets/js/config.js` as `ocmKey: "your-key"` and commit.

Without a key the section shows Open Charge Map's own embedded map instead. "Status" is the last reported working state, not live free/busy occupancy; South African networks don't publish occupancy openly.
