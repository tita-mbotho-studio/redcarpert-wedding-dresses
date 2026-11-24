import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { catalogueProducts } from '../src/data/catalogue.ts';
import { weddingMomentEvents, flattenWeddingMomentEvents } from '../src/lib/wedding-moments.ts';

/** Exercise the centralized fallback with deliberately failed CDN derivatives.
 * Run after npm run preview, against http://localhost:4173. */
const browser=await chromium.launch({args:['--no-sandbox']});
const root='http://localhost:4173/redcarpert-wedding-dresses';
// Match actual client image formats. Serving SVG bytes under .webp/.jpg URLs can
// produce browser-dependent decode failures rather than testing our fallback.
const fixture={create:{width:800,height:1000,channels:3,background:'#d0c0b0'}};
const [webp,jpeg]=await Promise.all([
  sharp(fixture).webp().toBuffer(),
  sharp(fixture).jpeg().toBuffer(),
]);
try {
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const failures=[];
  const imageRequests=[];
  page.on('pageerror',e=>failures.push(e.message));
  await page.route('https://ik.imagekit.io/**',route=>{
    const url=new URL(route.request().url());
    const transformed=url.searchParams.has('tr');
    imageRequests.push({url:url.toString(),transformed});
    if(transformed)return route.abort('failed');
    const isJpeg=/\.(?:jpe?g)$/i.test(url.pathname);
    return route.fulfill({status:200,contentType:isJpeg?'image/jpeg':'image/webp',body:isJpeg?jpeg:webp});
  });

  await page.goto(root+'/product/preview/ball-gown-01/',{waitUntil:'domcontentloaded'});
  const detail=page.locator('[data-gallery-active-image]');
  const original=catalogueProducts.find(item=>item.id==='ball-gown-01')?.image;
  assert(original?.startsWith('https://ik.imagekit.io/'));
  try {
    await page.waitForFunction(expected=>{
      const img=document.querySelector('[data-gallery-active-image]');
      return img && img.getAttribute('src')===expected && img.naturalWidth>0;
    },original,{timeout:15000});
  } catch(error) {
    const imageState=await detail.evaluate(img=>({
      src:img.getAttribute('src'),original:img.dataset.mediaOriginal??null,
      complete:img.complete,naturalWidth:img.naturalWidth,loading:img.loading,
    }));
    throw new Error('Dress ImageKit fallback failed: '+JSON.stringify({
      expected:original,imageState,requests:imageRequests.slice(-15),pageErrors:failures,
    }),{cause:error});
  }
  assert.equal(await detail.getAttribute('src'),original,
    'failed CDN derivative must fall back to original detailed image');

  await page.goto(root+'/wedding-moments/',{waitUntil:'domcontentloaded'});
  // The gallery displays newest events first. Source event[0] is NOT the first
  // visible card after the Ruffled wedding photos were imported.
  const displayedMedia=flattenWeddingMomentEvents(weddingMomentEvents);
  const firstMedia=displayedMedia[0];
  const firstOriginal=firstMedia.type==='video'?firstMedia.poster:firstMedia.url;
  assert(firstOriginal?.startsWith('https://ik.imagekit.io/'));
  const tile=page.locator('[data-wedding-moments-grid] img').first();
  await page.waitForFunction(expected=>{
    const img=document.querySelector('[data-wedding-moments-grid] img');
    return img && img.getAttribute('src')===expected && img.naturalWidth>0;
  },firstOriginal,{timeout:15000});
  assert.equal(await tile.getAttribute('src'),firstOriginal,
    'first visible wedding thumbnail must fall back to its actual original');

  // Check the video separately rather than mistaking it for the first card.
  const videoMedia=displayedMedia.find(item=>item.type==='video');
  assert(videoMedia && videoMedia.poster.includes('/ik-thumbnail.jpg'));
  const videoTile=page.locator('[data-wedding-moments-grid] button[data-wedding-media="video"] img').first();
  assert.equal(await videoTile.count(),1,'one playable video must be visible in the first gallery page');
  await videoTile.scrollIntoViewIfNeeded();
  await page.waitForFunction(expected=>{
    const img=document.querySelector('[data-wedding-moments-grid] button[data-wedding-media="video"] img');
    return img && img.getAttribute('src')===expected && img.naturalWidth>0;
  },videoMedia.poster,{timeout:15000});
  assert.equal(await videoTile.getAttribute('src'),videoMedia.poster,
    'failed video poster derivative must fall back to its original thumbnail');

  await page.goto(root+'/',{waitUntil:'domcontentloaded'});
  const originalHero=await page.locator('[data-media-background-original]').first().getAttribute('data-media-background-original');
  await page.waitForFunction(original=>{
    const panel=document.querySelector('[data-media-background-original]');
    return panel?.style.getPropertyValue('--redcarpert-home-photo').includes(original);
  },originalHero,{timeout:15000});
  assert.equal(await page.locator('[data-media-background-original]').count(),3,
    'all three homepage photos retain fallback URLs');
  assert.deepEqual(failures,[],'media errors must be handled, not crash application JS');
  await page.close();
  console.log('Central media delivery fallback PASS: dress detail, Wedding Moments and homepage');
} finally {
  await browser.close();
}
