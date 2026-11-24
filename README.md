# Redcarpert Wedding Dresses

The client-facing bridal catalogue for **Redcarpert Wedding Dresses**, developed by Tita & Mbotho Digital Studio.

The website is a static Vite / TypeScript site with 53 distinct bridal catalogue entries across five collections: Mermaid (2), Ball Gown (16), Ruffled (6), Modern Tradition (6), and 2 in 1 (23). ImageKit hosts the approved photographs and wedding videos. Visitors can browse galleries, explore the 55-page Digital Lookbook, download the 65-page editorial PDF Lookbook, and request fittings through pre-filled WhatsApp Business links. There is no online checkout.

## Local setup

Node.js 24 recommended. Chromium is required to generate the PDF:

```powershell
npm ci
npm run setup
npm run media:audit
npm run check
npm run test:dist
npm run dev
```

Visit `http://localhost:5173/redcarpert-wedding-dresses-main/`. Changes to catalogue data or page adapters require restarting `npm run dev` to regenerate the HTML.

## Data and media

- Dress photographs: `src/data/client-*-dresses.json` (including `client-modern-tradition-dresses.json`)
- Sale and rental prices: `src/data/products.json`
- Homepage, team and Wedding Moments media: `src/data/image-links.json`
- All source URLs continue to use ImageKit. Updating a photograph at the same path may require a fresh `updatedAt` query parameter to avoid stale CDN content.
- `npm run media:audit` reports referenced sources and responsive ImageKit variants; `npm run media:prepare` performs a network-backed ImageKit validation/warm-up.

## Build and validation

```powershell
npm run check
npm run test:dist
npm run preview -- --port 4173
```

The production preview is at `http://localhost:4173/redcarpert-wedding-dresses-main/`. With the preview running, `npm run test:browser` executes Chromium regression checks for the catalogue, galleries, navigation, WhatsApp messages, responsive layouts and interactive lookbook.

## GitHub Pages

The independent repository's public Pages address (after a successful approved deployment) is:

**https://tita-mbotho-studio.github.io/redcarpert-wedding-dresses-main/**

The GitHub Pages base is defined in `src/config/site.ts` and reused by Vite and the generator. The production workflow at `.github/workflows/pages.yml` has a manual `workflow_dispatch` trigger only. Commits and pull requests do not deploy automatically. Always run full checks before manually deploying.

****Independent repository migration:** The former forked repository and its published site remain separate. Pages must be enabled and configured to publish with GitHub Actions in the independent repository; keep the original site unchanged until the new address is verified.
