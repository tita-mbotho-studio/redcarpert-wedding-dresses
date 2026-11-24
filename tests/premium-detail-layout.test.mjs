import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync('src/components/ProductDetailPreview.css','utf8');
const browser=readFileSync('scripts/browser-content-alignment.mjs','utf8');
test('all dress pages use a compact centered grid rather than inherited WooCommerce floats',()=>{
 assert.match(css,/#main-container \[data-detail-preview\] \{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, var\(--detail-photo-width\)\) minmax\(0, 400px\);[^}]*max-width: 1040px;/s);
 assert.match(css,/> \.images\[data-detail-gallery\] \{[^}]*float: none !important;[^}]*max-width: var\(--detail-photo-width\);/s);
 assert.match(css,/> \.summary\.entry-summary\[data-redcarpert-detail-summary\] \{[^}]*float: none !important;[^}]*max-width: 400px;/s);
 assert.match(css,/grid-column: 1 \/ -1;\s*width: 100%;\s*padding-top: clamp\(24px, 3vw, 40px\)/);
});
test('portrait frame adapts to viewport height without cropping media or changing modal behavior',()=>{
 assert.match(css,/--detail-photo-width: clamp\(240px, calc\(\(100svh - 230px\) \* \.6667\), 400px\)/);
 assert.match(css,/> img\[data-gallery-active-image\] \{[^}]*height: auto;[^}]*max-height: calc\(var\(--detail-photo-width\) \* 1\.5\);[^}]*object-fit: contain;/s);
 assert.match(css,/> video\[data-gallery-active-video\]:not\(\[hidden\]\) \{[^}]*max-height: calc\(var\(--detail-photo-width\) \* 1\.5\);[^}]*object-fit: contain;/s);
 assert.match(css,/@media \(max-width: 767px\) \{\s*#main-container \[data-detail-preview\] \{[^}]*grid-template-columns: minmax\(0, 400px\);/s);
});
test('all-route browser suite checks detail geometry, prices, booking and no premature sizes',()=>{
 for(const check of ['metrics.card.width<=401','metrics.frame.height<=601','metrics.gallery.right+20<=metrics.card.left','metrics.gallery.bottom<=metrics.card.top','metrics.fittingHref?.startsWith','!metrics.hasSizes','!metrics.priceOverflow'])assert(browser.includes(check),check);
});
