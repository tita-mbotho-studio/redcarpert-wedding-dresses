import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const css=n=>read('src/components/'+n+'.css');
test('surface and elevation tokens use existing colors and a finite hierarchy',()=>{
 const globals=read('src/styles/globals.css');
 for(const [name,value] of Object.entries({white:'#fff',paper:'#fdfbf8',panel:'#fcfaf7',edge:'#e9ded2','edge-quiet':'#f2ede7'})){
  assert(globals.includes('--redcarpert-surface-'+name+': '+value+';'));
 }
 for(const name of ['card','raised','control','control-hover','floating'])assert(globals.includes('--redcarpert-shadow-'+name+':'));
 assert.match(globals,/--redcarpert-shadow-raised: 0 8px 24px/);
});
test('catalogue and detail cards use restrained elevations and preserved borders',()=>{
 const listing=css('CatalogueListing'),detail=css('ProductDetailPreview'),editorial=css('EditorialPages');
 assert.match(listing,/li\.product \{[^}]*border: 1px solid var\(--redcarpert-surface-edge-quiet\);[^}]*box-shadow: var\(--redcarpert-shadow-card\);/s);
 assert.match(detail,/\.redcarpert-detail-card \{[^}]*border: 1px solid var\(--redcarpert-surface-edge\);[^}]*border-radius: 2px;[^}]*box-shadow: var\(--redcarpert-shadow-raised\);/s);
 assert.match(editorial,/\.redcarpert-contact-card \{[^}]*box-shadow: var\(--redcarpert-shadow-card\);/s);
 assert(!detail.includes('0 22px 58px'));
});
test('decorative borders become transparent without changing dimensions or media',()=>{
 const editorial=css('EditorialPages'),filter=css('CatalogueFilter'),moments=css('WeddingMoments');
 assert.match(editorial,/\.redcarpert-editorial-panel \{[^}]*border: 1px solid transparent;/s);
 assert.match(editorial,/\.redcarpert-editorial-steps li \{[^}]*border: 1px solid transparent;/s);
 assert.match(filter,/border-block:1px solid var\(--redcarpert-surface-edge-quiet\);\s*border-block-start-color:transparent;/);
 assert.match(moments,/\.redcarpert-moment-dialog-inner \{[^}]*border: 0;[^}]*background: transparent;[^}]*box-shadow: none;/s);
 assert.match(editorial,/\.redcarpert-book-photo \{[^}]*background: var\(--book-paper\);[^}]*border: 0;/s);
});
test('matching circular controls share elevation and floating WhatsApp retains its own layer',()=>{
 for(const sheet of [css('EditorialPages'),css('ProductDetailPreview')]){
  assert.match(sheet,/box-shadow: var\(--redcarpert-shadow-control\);/);
  assert.match(sheet,/box-shadow: var\(--redcarpert-shadow-control-hover\);/);
  assert.match(sheet,/border-radius: 50%;/);
 }
 assert(css('ModernIcons').includes('box-shadow: var(--redcarpert-shadow-floating);'));
 assert(css('WhatsAppBrand').includes('--redcarpert-whatsapp-green: #25D366;'));
 assert(read('scripts/browser-content-alignment.mjs').includes('surface consistency'));
});
