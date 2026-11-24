import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(path,'utf8');
const css=name=>read('src/components/'+name+'.css');
test('component spacing uses a finite shared scale with all references defined',()=>{
 const tokens=[...read('src/styles/globals.css').matchAll(/--redcarpert-space-(\d+):\s*(\d+)px;/g)];
 assert.deepEqual(tokens.map(m=>Number(m[1])),[2,4,6,8,12,16,20,24,32,48]);
 assert(tokens.every(m=>m[1]===m[2]));
 for(const component of ['CatalogueListing','CatalogueFilter','ProductDetailPreview','EditorialPages','FooterBranding','WeddingMoments']){
  const refs=[...css(component).matchAll(/var\(--redcarpert-space-(\d+)\)/g)];
  assert(refs.length>0,component);
  assert(refs.every(ref=>tokens.some(token=>token[1]===ref[1])),component);
 }
});
test('catalogue captions are balanced without changing card or image grid geometry',()=>{
 const listing=css('CatalogueListing');
 assert.match(listing,/gap: var\(--redcarpert-space-4\);\s*width: 100%;\s*min-height: 116px;/);
 assert.match(listing,/padding: var\(--redcarpert-space-16\) var\(--redcarpert-space-8\) !important;/);
 assert.match(listing,/padding: var\(--redcarpert-space-12\) var\(--redcarpert-space-6\) !important;/);
 for(const columns of [4,3,2])assert(listing.includes('grid-template-columns: repeat('+columns+', minmax(0, 1fr))'));
 assert.match(listing,/aspect-ratio: 1 \/ 1;\s*object-fit: cover;\s*object-position: center 25%;/);
 const filter=css('CatalogueFilter');
 assert(filter.includes('gap:var(--redcarpert-filter-gap)'));
 for(const n of [4,3])assert(filter.includes('calc((100% - var(--redcarpert-filter-gap) * '+(n-1)+') / '+n+')'));
 assert(filter.includes('calc((100% - var(--redcarpert-filter-gap)) / 2)'));
 assert.match(filter,/min-height:44px/);
});
test('price groups and fitting controls use consistent spacing without resizing controls',()=>{
 const detail=css('ProductDetailPreview'), editorial=css('EditorialPages');
 assert.match(detail,/--redcarpert-price-separation: clamp\(var\(--redcarpert-space-12\), 1\.6vw, var\(--redcarpert-space-16\)\);/);
 assert(detail.includes('gap: var(--redcarpert-price-separation);'));
 assert(detail.includes('padding-top: var(--redcarpert-price-separation);'));
 assert.match(detail,/\.redcarpert-detail-price-label \{\s*display: block;\s*margin: 0 0 var\(--redcarpert-space-4\);/);
 for(const sheet of [detail,editorial]){
  assert(sheet.includes('gap: var(--redcarpert-space-8);'));
  assert.match(sheet,/width: 48px !important;/);
  assert.match(sheet,/width: 44px !important;/);
 }
 assert(detail.includes('white-space: nowrap;'));
});
test('browser regression checks exercise the computed spacing on existing routes',()=>{
 const browser=read('scripts/browser-content-alignment.mjs');
 for(const prop of ['captionGap','captionTop','filterGap','priceGap','priceSeparator','priceLabelGap','fittingGap','contactGap','footerGap'])assert(browser.includes('spacing.'+prop));
 assert.match(browser,/for\(const width of \[320,390,768,1024,1440\]\)/);
});
