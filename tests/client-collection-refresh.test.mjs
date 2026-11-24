import assert from 'node:assert/strict';
import test from 'node:test';
import imageLinks from '../src/data/image-links.json' with {type:'json'};
import mermaid from '../src/data/client-mermaid-dresses.json' with {type:'json'};
import ballGowns from '../src/data/client-ball-gowns.json' with {type:'json'};
import twoInOne from '../src/data/client-two-in-one-dresses.json' with {type:'json'};
import ruffled from '../src/data/client-ruffled-dresses.json' with {type:'json'};
import prices from '../src/data/products.json' with {type:'json'};
import modern from '../src/data/client-modern-tradition-dresses.json' with {type:'json'};
import { catalogueProducts } from '../src/data/catalogue.ts';
import { mediaDeliveryUrl } from '../src/lib/media-delivery.ts';
import { photosForDress, validateDressGalleryMappings } from '../src/lib/dress-gallery.ts';

const root = 'https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses';

test('updated homepage originals and ImageKit hero optimizations keep all three supplied revisions',()=>{
  const versions=['1794955340352','1794955340262','1794955340871'];
  assert.equal(imageLinks.home_page.hero.length,3);
  for (const [index,photo] of imageLinks.home_page.hero.entries()) {
    const name='home-page-'+(index+1);
    const url=new URL(photo.url);
    assert.equal(photo.id,name);
    assert.equal(url.origin+url.pathname,root+'/home-page/'+name+'.webp');
    assert.equal(url.searchParams.get('updatedAt'),versions[index]);
    assert.equal(url.searchParams.size,1);
    const delivered=new URL(mediaDeliveryUrl(photo.url,'hero'));
    assert.equal(delivered.searchParams.get('updatedAt'),versions[index]);
    assert(delivered.searchParams.has('tr'));
  }
});

test('the latest ImageKit CSVs provide complete sequenced galleries for all five categories',()=>{
 const groups=[
  {records:mermaid,category:'mermaid',folder:'mermaid-dresses',count:2,photos:6},
  {records:ballGowns,category:'ball_gown',folder:'ball-gown-dresses',count:16,photos:46},
  {records:ruffled,category:'ruffled',folder:'ruffled-dresses',count:6,photos:35},
  {records:modern,category:'modern_tradition',folder:'modern-tradition-dresses',count:6,photos:29},
  {records:twoInOne,category:'two_in_one',folder:'2-in-1-dresses',count:23,photos:109}
 ];
 const urls=new Set();
 for(const group of groups){
  assert.equal(group.records.length,group.count);
  assert.equal(group.records.reduce((n,r)=>n+r.photos.length,0),group.photos);
  for(const record of group.records){
   const product=catalogueProducts.find(p=>p.id===record.id);
   assert(product,record.id+' not in catalogue');
   assert.equal(product.category,group.category);
   assert.equal(product.name,record.name);
   assert.equal(product.image,record.photos[0].url);
   assert.deepEqual(photosForDress(product),record.photos);
   for(const [index,photo] of record.photos.entries()){
    const url=new URL(photo.url);
    assert(url.pathname.toLowerCase().includes('/'+group.folder+'/'));
    assert.equal(url.pathname.match(/-(\d{2})\.webp$/i)?.[1],String(index+1).padStart(2,'0'));
    assert(photo.alt.includes(record.name));
    assert(!urls.has(photo.url),'repeated ImageKit media '+photo.url);
    urls.add(photo.url);
    const served=new URL(mediaDeliveryUrl(photo.url,'detail'));
    assert.equal(served.pathname,url.pathname);
    assert.equal(served.searchParams.get('updatedAt'),url.searchParams.get('updatedAt'));
    assert(served.searchParams.has('tr'));
   }
  }
 }
 assert.equal(urls.size,225);
 assert.deepEqual(modern.find(d=>d.id==='modern-tradition-06').videos.length,1);
 assert.doesNotThrow(()=>validateDressGalleryMappings());
});

test('the catalogue, pricing and both lookbooks share 53 unique dress identities',()=>{
 assert.equal(catalogueProducts.length,53);
 assert.deepEqual(Object.fromEntries(['mermaid','ball_gown','ruffled','modern_tradition','two_in_one']
   .map(category=>[category,catalogueProducts.filter(p=>p.category===category).length])),
   {mermaid:2,ball_gown:16,ruffled:6,modern_tradition:6,two_in_one:23});
 assert.equal(prices.dresses.length,53);
 assert.equal(Object.keys(prices.priceRangesZar).length,53);
 assert.equal(new Set(catalogueProducts.map(p=>p.id)).size,53);
 assert.equal(new Set(catalogueProducts.map(p=>p.image)).size,53);
 assert.deepEqual(catalogueProducts.map(p=>p.id).sort(),prices.dresses.map(p=>p.id).sort());
 assert(!catalogueProducts.some(p=>/^ruffled-dress-(?:01|06|08|09|10|11|12|16|17)$/.test(p.id)),
   'removed transfers must not keep stale media URLs');
});
