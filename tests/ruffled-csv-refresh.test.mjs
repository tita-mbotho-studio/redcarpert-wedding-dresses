import test from 'node:test';
import assert from 'node:assert/strict';
import ruffled from '../src/data/client-ruffled-dresses.json' with {type:'json'};
import twoInOne from '../src/data/client-two-in-one-dresses.json' with {type:'json'};
import {catalogueProducts,catalogueCategories} from '../src/data/catalogue.ts';
import {photosForDress,validateDressGalleryMappings} from '../src/lib/dress-gallery.ts';
import {lookbookPlacements} from '../src/lib/lookbook-placements.ts';
import {salePriceForDress,rentalPriceRangeForDress} from '../src/lib/pricing.ts';

test('all six Ruffled gowns use named client ImageKit uploads, not removed transfers',()=>{
 assert.equal(ruffled.length,6);
 assert.equal(ruffled.reduce((n,p)=>n+p.photos.length,0),35);
 const current=catalogueProducts.filter(p=>p.category==='ruffled');
 assert.deepEqual(current.map(p=>p.id),ruffled.map(p=>p.id));
 for(const dress of ruffled){
  const product=current.find(p=>p.id===dress.id);
  assert(product);
  assert.equal(product.name,dress.name);
  assert.match(dress.name,/^[A-Za-z0-9 ]+ Dress$/);
   assert(!dress.name.startsWith('Ruffled '),'collection name must not prefix the client dress name');
  assert.deepEqual(photosForDress(product),dress.photos);
  assert(Number.isSafeInteger(salePriceForDress(dress.id)));
  assert(rentalPriceRangeForDress(dress.id).maxZar>rentalPriceRangeForDress(dress.id).minZar);
 }
 assert.doesNotThrow(()=>validateDressGalleryMappings());
});

test('the nine obsolete Ruffled-origin 2 in 1 dresses no longer appear in either lookbook',()=>{
 const moved=[1,6,8,9,10,11,12,16,17]
  .map(n=>'ruffled-dress-'+String(n).padStart(2,'0'));
 assert.equal(twoInOne.length,23);
 assert.equal(twoInOne.reduce((n,p)=>n+p.photos.length,0),109);
 for(const id of moved){
  assert(!twoInOne.some(p=>p.id===id));
  assert(!catalogueProducts.some(p=>p.id===id));
 }
 const placements=lookbookPlacements(catalogueProducts);
 assert.equal(placements.length,53);
 assert.equal(placements.filter(p=>p.category==='ruffled').length,6);
 assert.equal(placements.filter(p=>p.category==='two_in_one').length,23);
 assert.equal(placements.length+2,55);
 assert.equal(placements.length+catalogueCategories.length+7,65);
});
