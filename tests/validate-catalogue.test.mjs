import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogueProducts} from '../src/data/catalogue.ts';
import {validateCatalogue} from '../src/lib/validate-catalogue.ts';
const copy=()=>structuredClone(catalogueProducts);
const change=(id,patch)=>copy().map(p=>p.id===id?{...p,...patch}:p);

test('53 unique catalogue gowns use five verified client category manifests',()=>{
 const records=copy(),before=JSON.stringify(records);
 assert.doesNotThrow(()=>validateCatalogue(records));
 assert.equal(JSON.stringify(records),before);
 assert.equal(records.length,53);
 assert.deepEqual(Object.fromEntries(['mermaid','ball_gown','ruffled','modern_tradition','two_in_one']
  .map(c=>[c,records.filter(p=>p.category===c).length])),
  {mermaid:2,ball_gown:16,ruffled:6,modern_tradition:6,two_in_one:23});
 assert.equal(new Set(records.map(p=>p.image)).size,53);
 assert(records.every(p=>p.image.startsWith('https://ik.imagekit.io/') &&
  p.imageCredit.provenance==='client-supplied'));
});

test('catalogue rejects incorrect identities, URLs, prices, categories and membership',()=>{
 const records=copy(),first=records[0],id='ball-gown-01';
 assert.throws(()=>validateCatalogue(records.slice(0,7)),/Catalogue must contain 53 dresses/);
 assert.throws(()=>validateCatalogue(records.map((p,i)=>i===1?{...p,id:first.id}:p)),/Duplicate or invalid product ID/);
 assert.throws(()=>validateCatalogue(records.map((p,i)=>i===1?{...p,previewRoute:first.previewRoute}:p)),/Duplicate or invalid preview route/);
 assert.throws(()=>validateCatalogue(records.map((p,i)=>i===1?{...p,image:first.image}:p)),/Duplicate primary photograph/);
 for(const [patch,expected] of [
  [{detailReference:'/product/other'},/Unverified catalogue status/],
  [{image:'https://images.pexels.com/example.webp'},/Invalid client photo metadata/],
  [{imageAlt:'Incorrect asset'},/Invalid client photo metadata/],
  [{name:'Invented Dress'},/Incorrect client dress mapping/],
  [{category:'other'},/Unapproved category/],
  [{priceZar:-1},/Invalid catalogue price/],
  [{collections:['ball_gown','modern_tradition']},/Invalid multi-collection membership/],
 ]){
  assert.throws(()=>validateCatalogue(change(id,patch)),expected);
 }
});

test('Clockwise has its client-uploaded MP4 and no Modern Tradition source alias',()=>{
 const modern=copy().filter(p=>p.category==='modern_tradition');
 assert.equal(modern.length,6);
 assert(modern.every(p=>p.sourceDressId===undefined));
 const clockwise=modern.find(p=>p.id==='modern-tradition-06');
 assert.equal(clockwise.videos.length,1);
 assert.match(clockwise.videos[0].url,/modern-tradition-clockwise-dress-video-01\.mp4/);
 assert.throws(()=>validateCatalogue(change('modern-tradition-06',{videos:[]})),/Invalid client photo metadata/);
});
