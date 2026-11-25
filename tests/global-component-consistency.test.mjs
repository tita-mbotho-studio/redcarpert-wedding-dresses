import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const css=n=>read('src/components/'+n+'.css');
test('dark chrome uses existing color roles while preserving responsive footer and header geometry',()=>{
 const globals=read('src/styles/globals.css'),footer=css('FooterBranding'),icons=css('ModernIcons');
 for(const [name,value] of Object.entries({heading:'#f7f7f7',text:'#c7c7c7',icon:'#f1f1f1','link-hover':'#fff',accent:'#e1b77e'})){
  assert(globals.includes('--redcarpert-dark-'+name+': '+value+';'));
 }
 assert(footer.includes('color: var(--redcarpert-dark-heading);'));
 assert(footer.includes('color: var(--redcarpert-dark-text);'));
 assert(footer.includes('grid-template-columns: minmax(0, 45fr) minmax(0, 25fr) minmax(0, 30fr);'));
 assert(icons.includes('min-width: 44px !important;'));
 assert.match(icons,/\.redcarpert-footer-social-whatsapp\s*\{\s*color:\s*#f1f1f1;/);
 assert.match(icons,/\.redcarpert-footer-social-whatsapp:hover\s*\{[^}]*color:\s*#fff;/);
 // Preserve exact parity with shared neutral color roles, including literal brand exceptions.
 assert(globals.includes('--redcarpert-dark-icon: #f1f1f1;'));
 assert(globals.includes('--redcarpert-dark-link-hover: #fff;'));
});
test('desktop and mobile navigation have visible focus and current-page decoration without resizing',()=>{
 const icons=css('ModernIcons'),home=css('HomepageExperience');
 assert.match(icons,/#header :is\(\.nav-menu, \.mob-nav-menu\) a\[aria-current=page\] \{[^}]*text-decoration: underline;/s);
 assert.match(icons,/#header :is\(\.nav-menu, \.mob-nav-menu\) :is\(a, button\):focus-visible \{[^}]*outline: 2px solid var\(--redcarpert-control-focus-dark\);/s);
 assert.match(icons,/body\.redcarpert-home-native #header \.mob-nav-menu \{[^}]*background: rgba\(0, 0, 0, \.50\) !important;/s);
 assert.match(home,/a\.button:focus-visible \{[^}]*outline: 2px solid var\(--redcarpert-control-focus-dark\);/s);
});
test('web and PDF lookbooks use the same readable category and link ink',()=>{
 const web=css('EditorialPages'),pdf=read('src/lib/luxury-lookbook.ts'),globals=read('src/styles/globals.css');
 assert(globals.includes('--redcarpert-editorial-link: #8d6845;'));
 assert.match(web,/\.redcarpert-book-dress \.redcarpert-book-kicker \{[^}]*color: var\(--redcarpert-text-secondary\);/s);
 assert.match(web,/\.redcarpert-book-kicker \{[^}]*color: var\(--book-gold\);/s);
 for(const selector of ['.redcarpert-book-copy a','.redcarpert-book-back-links a']){
  const start=web.indexOf(selector+' {');
  assert(start>=0);
  assert(web.slice(start,web.indexOf('}',start)).includes('color: var(--redcarpert-editorial-link);'));
 }
 assert.match(pdf,/\.dress-bottom \.kind\{[^}]*color:#636363\}/);
 assert.match(pdf,/\.dress-bottom \.detail-link\{[^}]*color:#8D6845;/);
 assert.match(pdf,/\.back-links a\{[^}]*color:#8D6845;/);
});
test('shared focus tokens preserve the dedicated WhatsApp and media behavior',()=>{
 assert.match(css('WeddingMoments'),/\.redcarpert-moments-media-card > :is\(button,a\):focus-visible \{[^}]*outline: 2px solid var\(--redcarpert-control-focus\);/s);
 assert.match(css('ProductDetailPreview'),/a\.button\.redcarpert-detail-fitting-button:focus-visible \{[^}]*outline: 2px solid var\(--redcarpert-control-focus\) !important;/s);
 assert(css('WhatsAppBrand').includes('--redcarpert-whatsapp-green: #25D366;'));
 assert(css('LookbookZoom').includes('outline: none !important;'));
 assert(read('scripts/browser-footer-parity.mjs').includes('footer text hierarchy'));
 assert(read('scripts/browser-lookbook.mjs').includes('book detail link ink'));
});
