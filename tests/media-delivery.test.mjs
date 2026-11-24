import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mediaDeliveryUrl, mediaImageAttrs, mediaVideoAttrs, mediaResponsiveVariants, mediaResponsiveAttrs } from '../src/lib/media-delivery.ts';
import { homepageBackgrounds } from '../src/lib/homepage-backgrounds.ts';
import { catalogueProducts } from '../src/data/catalogue.ts';
import imageLinks from '../src/data/image-links.json' with {type:'json'};

const imagekit='https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/wedding-dresses/ball-gown-01/front.webp';
const external='https://cdn.example.com/images/external.jpeg';

test('one shared ImageKit policy covers future tiles, dress cards, details, modal photos, lookbook and hero',()=>{
 const expected = {
  tile:'w-640,h-640,c-maintain_ratio,fo-center,q-90,f-auto',
  card:'w-740,q-90,f-auto',
  detail:'w-1280,h-1800,c-at_max,q-92,f-auto',
  preview:'w-1920,h-1920,c-at_max,q-95,f-auto',
  lookbook:'w-1200,h-1600,c-at_max,q-92,f-auto',
  team:'w-900,h-1200,c-at_max,q-90,f-auto',
  hero:'w-2000,h-2000,c-at_max,q-92,f-auto',
 };
 for(const [preset, transform] of Object.entries(expected)){
  assert.equal(mediaDeliveryUrl(imagekit,preset),imagekit+'?tr='+transform);
  assert.equal(mediaDeliveryUrl(imagekit+'?updatedAt=42',preset),
   imagekit+'?updatedAt=42&tr='+transform);
 }
 assert.equal(mediaDeliveryUrl(imagekit+'?tr=w-300', 'card'),imagekit+'?tr=w-300');
 assert.equal(mediaDeliveryUrl('https://example.com/picture.jpg','card'),
  'https://example.com/picture.jpg');
 assert.equal(mediaDeliveryUrl('/redcarpert/brand/logo.webp','card'),
  '/redcarpert/brand/logo.webp');
 assert.equal(mediaDeliveryUrl(imagekit.replace('.webp','.mp4'),'preview'),
  imagekit.replace('.webp','.mp4'));
 assert.equal(mediaDeliveryUrl(imagekit.replace('.webp','.svg'),'card'),
  imagekit.replace('.webp','.svg'));
});

test('unapproved external image hosts are never rewritten as ImageKit client photos',()=>{
 assert.equal(mediaDeliveryUrl(external,'card'),external);
 assert.equal(mediaDeliveryUrl(external+'?w=300','detail'),external+'?w=300');
});

test('generated image markup uses requested contexts and stores originals for fallback',()=>{
 const card=mediaImageAttrs({src:imagekit,class:'attachment-woocommerce_thumbnail',loading:'lazy',decoding:'async',srcset:imagekit+' 500w'});
 assert.equal(card.src,mediaDeliveryUrl(imagekit,'card'));
 assert.equal(card['data-media-original'],imagekit);
 assert.equal(card.srcset,mediaResponsiveAttrs(imagekit,'card').srcset);
 assert.match(card.sizes,/31vw/);
 assert(!card.srcset.includes(imagekit+' 500w'));
 assert.equal(card.loading,'lazy');
 const gallery=mediaImageAttrs({src:imagekit,'data-gallery-active-image':'',fetchpriority:'high'});
 assert.equal(gallery.src,mediaDeliveryUrl(imagekit,'detail'));
 assert.equal(gallery.loading,'eager');
 const about=mediaImageAttrs({src:external,alt:'A tailor at work'});
 assert.equal(about.src,external);
 assert.equal(about.loading,'lazy');
 assert.equal(about.decoding,'async');
 const logo=mediaImageAttrs({src:'/redcarpert/brand/redcarpert-logo-optimized.webp',alt:'Logo'});
 assert.equal(logo['data-media-original'],undefined);
 assert.equal(logo.src,'/redcarpert/brand/redcarpert-logo-optimized.webp');
});

test('all current and future ImageKit sources pass through central delivery rules',()=>{
 for(const product of catalogueProducts){
  assert(mediaDeliveryUrl(product.image,'card').startsWith('https://'));
  assert(mediaDeliveryUrl(product.image,'detail').startsWith('https://'));
  assert(mediaDeliveryUrl(product.image,'lookbook').startsWith('https://'));
 }
 for(const hero of homepageBackgrounds){
  assert.equal(hero.delivery,mediaDeliveryUrl(hero.replacement,'hero'));
 }
 for(const item of imageLinks.about_us.team){
  const delivered=mediaDeliveryUrl(item.url,'team');
  const original=new URL(item.url);
  const transformed=new URL(delivered);
  assert.equal(original.hostname,'ik.imagekit.io','About Us team uses client-supplied ImageKit portraits');
  assert.equal(transformed.hostname,original.hostname);
  assert.equal(transformed.pathname,original.pathname,'team optimization must preserve image identity');
  assert.equal(transformed.searchParams.get('tr'),'w-900,h-1200,c-at_max,q-90,f-auto',
    'About Us portraits must use the shared team preset');
  const rendered=mediaImageAttrs({src:item.url,alt:'Portrait of '+item.name});
  assert.equal(rendered['data-media-original'],item.url,'retain original ImageKit URL for fallback');
  assert.equal(rendered.src,delivered);
 }
});

test('future video posters are optimized, native MP4s remain on demand',()=>{
 const poster=mediaVideoAttrs({src:'https://cdn.example/film.mp4',poster:imagekit});
 assert.equal(poster.src,'https://cdn.example/film.mp4');
 assert.equal(poster.preload,'none');
 assert.equal(poster.poster,mediaDeliveryUrl(imagekit,'tile'));
 assert.equal(poster['data-media-poster-original'],imagekit);
 const noPoster=mediaVideoAttrs({src:'https://cdn.example/film.mp4',controls:''});
 assert.equal(noPoster.preload,'none');
});

test('page-specific files cannot drift into duplicate transformation size rules',()=>{
 const usesSharedPolicy=[
  'src/lib/wedding-moment-image-delivery.ts',
  'src/lib/homepage-backgrounds.ts',
  'src/lib/wedding-moments.ts',
  'scripts/lib/markup.ts',
  'src/client/dress-gallery.js',
 ];
 for(const path of usesSharedPolicy){
  const content=readFileSync(path,'utf8');
  assert(!/w-\d+,h-\d+,c-at_max/.test(content),
   path+' must use the site-wide media helper, not hardcoded ImageKit sizing');
 }
});

test('grid variants have exact declared widths, bounded requests and preserve client URL revisions',()=>{
 const source=imagekit+'?updatedAt=42';
 for(const preset of ['tile','card']){
  const variants=mediaResponsiveVariants(source,preset);
  assert.deepEqual(variants.map(item=>item.width),[320,480,640,960,1280]);
  for(const item of variants){
   const url=new URL(item.url);
   assert.equal(url.pathname,new URL(source).pathname);
   assert.equal(url.searchParams.get('updatedAt'),'42');
   const tr=url.searchParams.get('tr');
   assert(tr.startsWith('w-'+item.width+','));
   if(preset==='tile')assert.equal(tr,'w-'+item.width+',h-'+item.width+',c-maintain_ratio,fo-center,q-90,f-auto');
   else assert.equal(tr,'w-'+item.width+',q-90,f-auto');
  }
  const attrs=mediaResponsiveAttrs(source,preset);
  assert.equal(attrs.srcset,variants.map(item=>item.url+' '+item.width+'w').join(', '));
  assert(attrs.sizes.includes('vw'));
 }
 for(const preset of ['detail','preview','lookbook','team','hero'])assert.deepEqual(mediaResponsiveVariants(source,preset),[]);
 assert.deepEqual(mediaResponsiveVariants(external,'tile'),[]);
 assert.deepEqual(mediaResponsiveVariants(source+'&tr=w-100','card'),[]);
 assert.equal(mediaDeliveryUrl(source,'tile',999999),mediaDeliveryUrl(source,'tile'));
});
