import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const css=n=>read('src/components/'+n+'.css');

test('all authored Redcarpert CSS token references have a definition',()=>{
 const files=['src/styles/globals.css','src/styles/TextHierarchy.css','src/styles/ContentAlignment.css',
  ...readdirSync('src/components').filter(name=>name.endsWith('.css')).map(name=>'src/components/'+name)];
 const source=files.map(read).join('\n').replace(/\/\*[\s\S]*?\*\//g,'');
 const declared=new Set([...source.matchAll(/(--redcarpert-[\w-]+)\s*:/g)].map(match=>match[1]));
 // The homepage photograph is deliberately generated as a per-section inline token.
 assert(read('src/lib/homepage-backgrounds.ts').includes('--redcarpert-home-photo:url('));
 declared.add('--redcarpert-home-photo');
 const refs=[...new Set([...source.matchAll(/var\(\s*(--redcarpert-[\w-]+)\s*\)/g)].map(match=>match[1]))];
 assert(refs.length>=20);
 assert.deepEqual(refs.filter(name=>!declared.has(name)),[]);
});

test('shared editorial text colors meet normal-text contrast on approved light and dark surfaces',()=>{
 const globals=read('src/styles/globals.css')+'\n'+read('src/styles/TextHierarchy.css');
 const color=name=>{
  const m=globals.match(new RegExp('--redcarpert-'+name+':\\s*(#[0-9a-f]{3,6});','i'));
  assert(m,name);return m[1];
 };
 const lum=hex=>{
  let value=hex.slice(1);
  if(value.length===3)value=[...value].map(ch=>ch+ch).join('');
  const [r,g,b]=value.match(/../g).map(part=>parseInt(part,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b;
 };
 const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 for(const foreground of ['text-primary','text-secondary','text-accent','editorial-link']){
  for(const background of ['surface-white','surface-paper','surface-panel']){
   assert(contrast(color(foreground),color(background))>=4.5,foreground+' on '+background);
  }
 }
 for(const foreground of ['dark-heading','dark-text','dark-icon']){
  assert(contrast(color(foreground),'#000')>=4.5,foreground+' on black');
 }
});

test('responsive cleanup preserves the shared caption gaps and minimum filter touch target',()=>{
 const listing=css('CatalogueListing'),filter=css('CatalogueFilter');
 assert.equal([...listing.matchAll(/gap: var\(--redcarpert-space-4\);/g)].length,1);
 assert.equal([...listing.matchAll(/margin: var\(--redcarpert-space-4\) 0;/g)].length,1);
 assert.equal([...filter.matchAll(/min-height:44px;/g)].length,1);
 assert.match(listing,/min-height: 110px;/);
 assert.match(filter,/flex-basis:calc\(\(100% - var\(--redcarpert-filter-gap\)\) \/ 2\);/);
});

test('WhatsApp focus improves without changing approved green-and-white branding',()=>{
 const brand=css('WhatsAppBrand');
 assert.equal([...brand.matchAll(/outline: 2px solid var\(--redcarpert-control-focus\)(?: !important)?;/g)].length,3);
 assert(brand.includes('--redcarpert-whatsapp-green: #25D366;'));
 assert(brand.includes('--redcarpert-whatsapp-white: #FFFFFF;'));
 assert(!brand.includes('#footer'));
});

test('release checks include painted PDF price bounds and all-route browser overflow and errors',()=>{
 const pdf=read('src/lib/luxury-lookbook.ts'),browser=read('scripts/browser-content-alignment.mjs');
 assert(pdf.includes('const priceTextOutside=[...fields].some'));
 assert(pdf.includes('range.selectNodeContents(element)'));
 assert(pdf.includes('rect.left<bounds.left-2 || rect.right>bounds.right+2'));
 assert(pdf.includes('outside || priceTextOutside || bottom.scrollHeight>bottom.clientHeight+2'));
 assert(browser.includes('await document.fonts.ready'));
 assert(browser.includes('Math.max(overflow.root,overflow.body)<=overflow.viewport+2'));
 assert(browser.includes("page.on('pageerror'"));
 assert(browser.includes('assert.deepEqual(pageErrors,[]'));
 assert(browser.includes('for(const route of allRoutes)'));
 for(const workflow of ['verify','pages']){
  const yaml=read('.github/workflows/'+workflow+'.yml');
  assert.match(yaml,/^  workflow_dispatch:$/m);
  assert.match(yaml,/npm run test:browser/);
 }
});
