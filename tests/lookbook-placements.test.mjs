import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogueProducts, catalogueCategories } from '../src/data/catalogue.ts';
import { modernTraditionPages } from '../src/lib/modern-tradition.ts';
import { lookbookPlacements } from '../src/lib/lookbook-placements.ts';

test('both lookbooks include all 53 dresses and all five groups',()=>{
 const placements=lookbookPlacements(catalogueProducts);
 assert.equal(placements.length,53);
 assert.equal(new Set(placements.map(p=>p.id)).size,53);
 assert.deepEqual(catalogueCategories.map(c=>placements.filter(p=>p.category===c.id).length),
   [2,16,6,6,23]);
 let offset=0;
 for(const category of catalogueCategories){
  const group=placements.filter(p=>p.category===category.id);
  assert.deepEqual(placements.slice(offset,offset+group.length),group);
  for(const item of group){
   assert.equal(item.id,item.product.id);
   assert.equal(item.detailRoute,item.product.previewRoute);
   assert.equal(item.displayName,item.product.name);
  }
  offset+=group.length;
 }
});

test('Modern Tradition has six original client photo groups, and book page counts track entries',()=>{
 const features=lookbookPlacements(catalogueProducts).filter(p=>p.isModernTradition);
 assert.deepEqual(features.map(p=>p.id),modernTraditionPages.map(p=>p.product.id));
 assert.equal(features.length,6);
 assert.equal(new Set(features.map(p=>p.product.image)).size,6);
 assert.equal(features[5].displayName,'Clockwise Dress');
 assert.equal(features[5].product.videos?.length,1);
 const total=catalogueProducts.length;
 assert.equal(total+2,55);
 assert.equal(total+catalogueCategories.length+7,65);
 assert.throws(()=>lookbookPlacements([...catalogueProducts,catalogueProducts[0]]),
   /duplicate dress IDs/);
});
