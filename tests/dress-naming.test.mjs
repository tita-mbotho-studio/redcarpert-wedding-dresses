import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueProducts, catalogueCategories} from '../src/data/catalogue.ts';
import {PENDING_DRESS_NAME} from '../src/data/dress-naming.ts';
import {lookbookPlacements} from '../src/lib/lookbook-placements.ts';
import {createNodeRenderer} from '../scripts/lib/markup.ts';
import {createLuxuryLookbookHtml} from '../src/lib/luxury-lookbook.ts';
import {dressFittingMessage} from '../src/lib/whatsapp-messages.ts';

const pending=catalogueProducts.filter(p=>p.name===PENDING_DRESS_NAME);
const named=catalogueProducts.filter(p=>p.name!==PENDING_DRESS_NAME);
const counts=items=>Object.fromEntries(catalogueCategories.map(c=>
  [c.id,items.filter(p=>p.category===c.id).length]));

test('all 53 dresses preserve client names or placeholders',()=>{
  assert.equal(catalogueProducts.length,53);
  assert.equal(pending.length,12);
  assert.equal(named.length,41);
  assert.deepEqual(counts(pending),{
    mermaid:0,ball_gown:10,ruffled:0,modern_tradition:2,two_in_one:0,
  });
  assert.deepEqual(counts(named),{
    mermaid:2,ball_gown:6,ruffled:6,modern_tradition:4,two_in_one:23,
  });
  assert.equal(new Set(catalogueProducts.map(p=>p.id)).size,53);
  for(const product of catalogueProducts){
    assert.equal(product.previewRoute,'/product/preview/'+product.id);
    assert(!Object.hasOwn(product,'dressReference'));
    assert(product.name.trim().length>0);
    if(product.name!==PENDING_DRESS_NAME){
      assert.match(product.name,/^[A-Za-z0-9 ]+ Dress$/);
      assert.doesNotMatch(product.name,/^(?:Mermaid|Ball Gown|Ruffled|Modern Tradition|2 in 1) /,
        'the customer-facing name must not include a collection prefix');
    }
  }
  assert.equal(pending.filter(p=>p.category==='ruffled').length,0);
});

test('Digital Lookbook and PDF display the same names without dress reference labels',()=>{
  const placements=lookbookPlacements(catalogueProducts);
  assert.equal(placements.length,53);
  const html=createNodeRenderer([])({tag:'div',attrs:{'data-lookbook-viewer':'true'},children:[]});
  const pages=[...html.matchAll(/<article class="redcarpert-book-page redcarpert-book-dress"[^>]*>[\s\S]*?<\/article>/g)]
    .map(x=>x[0]);
  assert.equal(pages.length,53);
  const images=catalogueProducts.map(p=>({
    id:p.id,jpeg:Buffer.from([0xff,0xd8,0xff,0xd9]),width:1200,height:1800,
  }));
  const pdf=createLuxuryLookbookHtml(catalogueProducts,images,{
    year:2026,logo:Buffer.from([0x89,0x50,0x4e,0x47]),
  });
  assert.equal((pdf.match(/<section class="page /g)||[]).length,65);
  assert.equal((html.match(/<h3>Name to be confirmed<\/h3>/g)||[]).length,12);
  assert.equal((pdf.match(/<h3>Name to be confirmed<\/h3>/g)||[]).length,12);
  assert(!/dress reference|data-book-dress-reference|redcarpert-book-dress-reference/i.test(html));
  assert(!/dress reference|class="dress-ref"/i.test(pdf));
  for(const placement of placements){
    const page=pages.find(x=>x.includes('data-book-entry-id="'+placement.id+'"'));
    assert(page,placement.id+' missing from Digital Lookbook');
    assert(page.includes('<h3>'+placement.displayName+'</h3>'),placement.id);
    assert.equal(placement.displayName,placement.product.name);
    assert(!Object.hasOwn(placement,'dressReference'));
  }
});

test('WhatsApp messages contain the correct names and dress links, but no reference',()=>{
  for(const product of catalogueProducts){
    const message=dressFittingMessage(product);
    assert(message.includes('*Dress:* '+product.name));
    assert(message.includes('*Dress Link:* '));
    assert(message.includes('*Sale Price:* '));
    assert(message.includes('*Rental Price Range:* '));
    assert(!/Dress Reference:/i.test(message));
  }
});
