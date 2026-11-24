import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const css=n=>read('src/components/'+n+'.css');
test('catalogue captions fill their row without shrinking square photographs or adding pricing',()=>{
 const listing=css('CatalogueListing');
 assert.match(listing,/\.redcarpert-catalogue-title \{[^}]*flex: 1 0 auto;/s);
 assert.match(listing,/\.woocommerce-LoopProduct-link > img \{[^}]*flex: 0 0 auto;[^}]*aspect-ratio: 1 \/ 1;/s);
 for(const cols of [4,3,2])assert(listing.includes('grid-template-columns: repeat('+cols+', minmax(0, 1fr))'));
 assert.doesNotMatch(listing,/redcarpert-catalogue-price/);
});
test('existing filter status and related dress names use readable shared colors',()=>{
 const filter=css('CatalogueFilter'), detail=css('ProductDetailPreview');
 assert.match(filter,/\.redcarpert-filter-status \{[^}]*color:var\(--redcarpert-text-secondary\);/s);
 assert.match(detail,/\.redcarpert-related-name \{[^}]*color: var\(--redcarpert-text-primary\);/s);
 assert.match(detail,/\.redcarpert-related-card > a:hover \.redcarpert-related-name \{[^}]*color: var\(--redcarpert-text-accent\);/s);
 assert.match(detail,/\.redcarpert-related-price-value \{[^}]*font-variant-numeric: lining-nums tabular-nums;/s);
 assert.match(detail,/white-space: nowrap;/);
});
test('both lookbooks retain equal pricing columns with a separator in the gap',()=>{
 const web=css('EditorialPages'), pdf=read('src/lib/luxury-lookbook.ts');
 assert.match(web,/\.redcarpert-book-price-pair \{[^}]*position: relative;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/s);
 assert.match(web,/\.redcarpert-book-price-pair::before \{[^}]*left: 50%;[^}]*pointer-events: none;/s);
 assert(!web.includes('.redcarpert-book-price-item + .redcarpert-book-price-item'));
 assert(pdf.includes('.price-pair{display:grid;position:relative;grid-template-columns:repeat(2,minmax(0,1fr));gap:7mm;'));
 assert(pdf.includes('.price-pair::before{content:"";position:absolute;top:0;bottom:0;left:50%;'));
 assert(!pdf.includes('.price-item+.price-item'));
 assert(pdf.includes('.amount{font:600 14pt/1.3 Montserrat,Arial,sans-serif;color:#252525;white-space:nowrap;'));
});
test('staff captions remain centered and client portrait geometry remains natural',()=>{
 const sheet=css('EditorialPages');
 assert.match(sheet,/\.redcarpert-editorial-team-card figcaption \{[^}]*min-height: 64px;[^}]*align-items: center;[^}]*justify-content: center;/s);
 assert.match(sheet,/\.redcarpert-editorial-team-card img \{[^}]*aspect-ratio: auto;[^}]*object-fit: initial;/s);
});
