import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueProducts,catalogueCategories} from '../src/data/catalogue.ts';
import modern from '../src/data/client-modern-tradition-dresses.json' with {type:'json'};
import {modernTraditionPages} from '../src/lib/modern-tradition.ts';
import {adaptCatalogue} from '../src/lib/catalogue-adapter.ts';
import {sitePages} from '../src/data/site.ts';
import {createNodeRenderer} from '../scripts/lib/markup.ts';
import {createLuxuryLookbookHtml} from '../src/lib/luxury-lookbook.ts';
import {lookbookPlacements} from '../src/lib/lookbook-placements.ts';
import {validateCatalogue} from '../src/lib/validate-catalogue.ts';
const all=nodes=>nodes.flatMap(n=>typeof n==='string'?[]:[n,...all(n.children)]);

test('Modern Tradition uses six distinct media groups rather than inherited Ball Gown links',()=>{
 assert.equal(catalogueProducts.length,53);
 assert.equal(modern.length,6);
 const products=catalogueProducts.filter(p=>p.category==='modern_tradition');
 assert.deepEqual(products.map(p=>p.id),modern.map(p=>p.id));
 assert.equal(new Set(products.map(p=>p.image)).size,6);
 for(const product of products){
  const entry=modern.find(e=>e.id===product.id);
  assert(entry);
  assert.equal(product.image,entry.photos[0].url);
  assert(product.image.includes('/modern-tradition-dresses/'));
  assert.deepEqual(product.collections,['modern_tradition']);
  assert.equal(product.sourceDressId,undefined);
  assert.equal(product.videos?.length,entry.videos?.length??0);
 }
 assert.deepEqual(products.map(p=>p.id),modernTraditionPages.map(p=>p.product.id));
 assert.doesNotThrow(()=>validateCatalogue(catalogueProducts));
});

test('Modern Tradition category links to all six new detail pages without numeric placeholder names',()=>{
 const route='/product-category/modern_tradition';
 const source={...sitePages['/product-category/mermaid'],route};
 const output=adaptCatalogue(source,catalogueProducts);
 const cards=all(output.nodes).filter(n=>n.attrs['data-catalogue-id']!==undefined);
 assert.equal(cards.length,6);
 for(const [i,card] of cards.entries()){
  const dress=modernTraditionPages[i];
  const title=all([card]).find(n=>n.tag==='h2');
  const link=all([card]).find(n=>n.tag==='a');
  assert.equal(title.children[0].children[0],'Modern Tradition');
  assert.equal(title.children[2].children[0],dress.name);
  assert.equal(link.attrs.href,dress.route);
  assert.equal(link.attrs['aria-label'],dress.name+': view dress photographs');
  assert.equal(all([card]).find(n=>n.tag==='img').attrs.src,dress.product.image);
 }
});

test('Digital Lookbook and PDF include 53 unique dresses and correct pricing slots',()=>{
 const placements=lookbookPlacements(catalogueProducts);
 const html=createNodeRenderer([])({tag:'div',attrs:{'data-lookbook-viewer':'true'},children:[]});
 const images=catalogueProducts.map(p=>({id:p.id,jpeg:Buffer.from([0xff,0xd8,0xff,0xd9]),width:1200,height:1800}));
 const pdf=createLuxuryLookbookHtml(catalogueProducts,images,{year:2026,logo:Buffer.from([0x89,0x50,0x4e,0x47])});
 assert.equal(placements.length,53);
 assert.equal((html.match(/data-book-page=/g)||[]).length,55);
 assert.equal((pdf.match(/<section class="page /g)||[]).length,65);
 assert.equal((html.match(/data-book-sale-price=/g)||[]).length,53);
 assert.equal((pdf.match(/data-pdf-sale-price=/g)||[]).length,53);
 for(const entry of modernTraditionPages){
  const id=entry.product.id;
  assert(html.includes('data-book-entry-id="'+id+'" data-book-category="modern_tradition"'));
  assert(html.includes('<h3>'+entry.name+'</h3>'));
  assert(pdf.includes('id="look-'+id+'"'));
  assert(pdf.includes('<h3>'+entry.name+'</h3>'));
 }
});
