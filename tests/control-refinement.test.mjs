import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const css=n=>read('src/components/'+n+'.css');
test('control tokens reuse existing brand red, charcoal and white',()=>{
 const global=read('src/styles/globals.css');
 assert.match(global,/--redcarpert-control-ink: #252525;/);
 assert.match(global,/--redcarpert-control-accent: #99001f;/);
 assert.match(global,/--redcarpert-control-focus: #252525;/);
 assert.match(global,/--redcarpert-control-focus-dark: #fff;/);
});
test('filter selected, hover, focus and press states preserve existing target sizing',()=>{
 const sheet=css('CatalogueFilter');
 assert.match(sheet,/button\[aria-pressed="true"\] \{[^}]*border-color:var\(--redcarpert-control-accent\);[^}]*color:var\(--redcarpert-control-accent\);/);
 assert(sheet.includes('button:not([aria-pressed="true"]):hover'));
 assert(sheet.includes('outline:2px solid var(--redcarpert-control-focus);'));
 assert(sheet.includes('min-height:44px'));
 assert.match(sheet,/prefers-reduced-motion: reduce[^}]*transition: none;/s);
});
test('primary, secondary and utility controls keep approved dimensions and behaviors',()=>{
 const home=css('HomepageExperience'), editorial=css('EditorialPages'), detail=css('ProductDetailPreview'), moments=css('WeddingMoments');
 assert.match(home,/a\.button:hover \{[^}]*background: rgba\(0,0,0,\.50\) !important;[^}]*box-shadow: inset/s);
 assert(editorial.includes('.redcarpert-icon-cta > a.button.redcarpert-icon-cta-button[download]'));
 for(const sheet of [editorial,detail]){
  assert(sheet.includes('width: clamp(36px, 3.4vw, 44px);'));
  assert(sheet.includes('height: clamp(36px, 3.4vw, 44px);'));
  assert(sheet.includes('width: 48px !important;'));
  assert(sheet.includes('width: 44px !important;'));
 }
 assert.match(editorial,/button:disabled \{ opacity: \.35; cursor: not-allowed; \}/);
 assert.match(moments,/\.redcarpert-wedding-preview-close \{[^}]*right: -56px;[^}]*width: 44px;/s);
 assert.match(editorial,/a\.redcarpert-contact-call \{[^}]*background: transparent;[^}]*color: #574634;/s);
});
test('focus and reduced motion refinements leave WhatsApp branding and photo interactions intact',()=>{
 const brand=css('WhatsAppBrand'), zoom=css('LookbookZoom'), icons=css('ModernIcons');
 assert(brand.includes('--redcarpert-whatsapp-green: #25D366;'));
 assert(brand.includes('--redcarpert-whatsapp-white: #FFFFFF;'));
 assert.match(zoom,/img\[data-book-zoom-photo\]\.redcarpert-book-pointer-restored:focus-visible \{[^}]*outline: none !important;/s);
 assert.match(icons,/prefers-reduced-motion: reduce[\s\S]*?\.redcarpert-whatsapp-float-dismiss:hover \{\s*transform: none;/);
 assert(read('scripts/browser-content-alignment.mjs').includes('exactly one selected filter'));
});
