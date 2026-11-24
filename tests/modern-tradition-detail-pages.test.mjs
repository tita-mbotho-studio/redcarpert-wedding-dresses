import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueProducts} from '../src/data/catalogue.ts';
import {modernTraditionPages,modernTraditionPageForDress,modernTraditionPageForRoute} from '../src/lib/modern-tradition.ts';
import {createProductDetailPreview} from '../src/lib/product-detail-preview.ts';
import {dressFittingMessage,dressPageUrl} from '../src/lib/whatsapp-messages.ts';
import {sitePages} from '../src/data/site.ts';
import {publicStaticRoutes} from '../src/lib/public-routes.ts';
import {preparePage} from '../scripts/lib/prepare-page.ts';
const all=nodes=>nodes.flatMap(n=>typeof n==='string'?[]:[n,...all(n.children)]);

test('six independently uploaded Modern Tradition gowns retain distinct pages and galleries',()=>{
 assert.deepEqual(modernTraditionPages.map(p=>p.product.id),
  [1,2,3,4,5,6].map(n=>'modern-tradition-'+String(n).padStart(2,'0')));
 const routes=publicStaticRoutes(sitePages,catalogueProducts.map(p=>p.previewRoute));
 assert.equal(routes.length,catalogueProducts.length+10);
 for(const page of modernTraditionPages){
  assert.equal(modernTraditionPageForDress(page.product.id),page);
  assert.equal(modernTraditionPageForRoute(page.route),page);
  assert(routes.includes(page.route));
  assert.equal(page.product.sourceDressId,undefined);
  assert(page.product.image.includes('modern-tradition-dresses'));
 }
});

test('details, related dresses, pricing, and WhatsApp use current Modern Tradition identities',()=>{
 for(const page of modernTraditionPages){
  const {document,product,modernPage}=preparePage(page.route);
  assert.equal(product,page.product);
  assert.equal(modernPage,page);
  assert.equal(document.route,page.route);
  assert(document.title.startsWith(page.name+' |'));
  const nodes=all(document.nodes);
  const root=nodes.find(n=>n.attrs['data-detail-preview']===product.id);
  assert(root);
  const content=all([root]);
  assert.deepEqual(content.find(n=>n.tag==='h1'&&n.attrs.class?.includes('redcarpert-detail-name')).children,[page.name]);
  assert.equal(content.find(n=>n.attrs['data-gallery-active-image']!==undefined)?.attrs.src,product.image);
  assert(content.find(n=>n.attrs['data-sale-price']!==undefined));
  assert(content.find(n=>n.attrs['data-rental-price']!==undefined));
  const related=content.filter(n=>n.attrs['data-related-dress']!==undefined);
  assert.equal(related.length,4);
  assert(related.every(r=>modernTraditionPages.some(p=>p.product.id===r.attrs['data-related-dress'])));
  const message=dressFittingMessage(product,modernPage);
  assert(message.includes('*Dress:* '+page.name));
  assert(message.includes('*Collection:* Modern Tradition Dresses'));
  assert(message.includes('*Dress Link:* '+dressPageUrl(product,page)));
  const videos=content.filter(n=>n.tag==='video');
  assert.equal(videos.length,product.videos?.length??0);
  if(product.id==='modern-tradition-06'){
    assert.equal(videos.length,1);
    assert(videos[0].attrs.src.endsWith('.mp4?updatedAt=1795474305668'));
    assert.equal(videos[0].attrs.poster,product.image);
    assert.equal(videos[0].attrs.controls,'');
    const gallery=content.find(n=>n.attrs['data-detail-gallery']===product.id);
    const media=JSON.parse(gallery.attrs['data-gallery-media']);
    assert.equal(media.length,7);
    assert.equal(media[6].type,'video');
    assert.equal(media[6].url,videos[0].attrs.src);
    const frame=content.find(n=>n.attrs['data-dress-frame']==='true');
    assert(all(frame.children).includes(videos[0]),'the video must share the main photo gallery frame');
    assert(!content.some(n=>n.attrs.class==='redcarpert-detail-video'),'no video section below the gallery');
  }
 }
});

test('a Modern Tradition page cannot be paired with another gown',()=>{
 assert.throws(()=>createProductDetailPreview(sitePages['/product/arabella'],
  modernTraditionPages[0].product,undefined,modernTraditionPages[1]),
  /incompatible Modern Tradition presentation/);
 assert.throws(()=>dressFittingMessage(modernTraditionPages[0].product,modernTraditionPages[1]),
  /Invalid Modern Tradition enquiry/);
});
