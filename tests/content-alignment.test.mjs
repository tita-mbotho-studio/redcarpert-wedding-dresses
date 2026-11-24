import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=path=>readFileSync(path,'utf8');
test('shared centering policy loads after captured and component styles',()=>{
 const source=read('scripts/generate.ts');
 const css=read('src/styles/ContentAlignment.css');
 assert.match(source,/'src\/components\/LookbookZoom\.css','src\/styles\/ContentAlignment\.css'/);
 assert.match(css,/#main-container[\s\S]*text-align: center !important;/);
 assert.match(css,/#header :is\(\.nav-menu, \.mob-nav-menu\)[\s\S]*text-align: center !important;/);
 assert.match(css,/#header \.mob-nav-menu #menu-item-15821 > a\s*\{\s*padding-inline: 50px;/);
 assert.doesNotMatch(css,/(?:^|\n)\s*\*\s*\{/,'never use universal alignment selector');
 assert.match(source,/redcarpert-not-found[^>]*><main style="text-align:center"/);
});
test('footer typography and fitting control are centered without changing grid tracks',()=>{
 const footer=read('src/components/FooterBranding.css');
 const icons=read('src/components/ModernIcons.css');
 assert.doesNotMatch(footer,/text-align:\s*(left|right|start|end)/);
 assert.match(footer,/justify-items: center;/);
 assert.match(footer,/grid-template-columns: minmax\(0, 45fr\) minmax\(0, 25fr\) minmax\(0, 30fr\)/);
 assert.match(icons,/\.redcarpert-footer-items a\.redcarpert-footer-book\s*\{[^}]*justify-content: center;/s);
});
test('PDF text, folios, bounded editorial sections and fitting link are centered',()=>{
 const pdf=read('src/lib/luxury-lookbook.ts');
 assert.match(pdf,/body\{font-family:Montserrat,Arial,sans-serif;text-align:center\}/);
 assert.match(pdf,/\.folio\{position:absolute;left:0;right:0;text-align:center;/);
 for(const section of ['front','welcome','divider','contact']){
  assert(pdf.includes('.'+section+' .content{justify-content:center;align-items:center}'));
 }
 assert.match(pdf,/\.button\{display:inline-block;align-self:center;text-align:center;/);
 assert.match(pdf,/Lookbook PDF text alignment:/);
});
