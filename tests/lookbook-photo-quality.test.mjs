import sharp from 'sharp';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLookbookPhotoDimensions,
  estimateLookbookPrintDpi,
  shouldReportLookbookPrintWarning,
  downloadLookbookClientImage,
  prepareOriginalLookbookPhoto,
} from '../scripts/lib/lookbook-assets.ts';

test('small client-supplied Ball Gown photos do not prevent PDF/site generation', () => {
  assert.doesNotThrow(() => validateLookbookPhotoDimensions({width:520,height:900},'ball-gown-06'));
  assert.doesNotThrow(() => validateLookbookPhotoDimensions({width:400,height:400},'ball-gown-06'));
  assert.doesNotThrow(() => validateLookbookPhotoDimensions({width:1200,height:1800},'ball-gown-03'));
});

test('native client dress photographs remain valid even at lower print resolution',()=>{
 assert.doesNotThrow(()=>validateLookbookPhotoDimensions({width:1200,height:1800},'ball-gown-01'));
 assert.doesNotThrow(()=>validateLookbookPhotoDimensions({width:520,height:900},'ball-gown-06'));
});

test('invalid or unreadable source images are still rejected', () => {
  for (const d of [{width:0,height:800},{width:250},{width:NaN,height:800},{width:-10,height:200}]) {
    assert.throws(() => validateLookbookPhotoDimensions(d,'ball-gown-06'),
      /Invalid lookbook image dimensions/);
  }
});

test('print readiness is estimated from actual encoded PDF image dimensions', () => {
  const small=estimateLookbookPrintDpi(520,900);
  assert(small>0 && small<300,'smaller client photos should be marked below print quality');
  assert(estimateLookbookPrintDpi(2000,2500)>=300);
  assert.throws(() => estimateLookbookPrintDpi(0,1200),/Invalid processed lookbook image dimensions/);
});

test('routine client print-resolution warnings are opt-in without changing DPI audit or error handling', () => {
  // The default is quiet unless REDCARPERT_PDF_PRINT_WARNINGS=1 is set.
  assert.equal(shouldReportLookbookPrintWarning(false,false),false);
  assert.equal(shouldReportLookbookPrintWarning(true,false),false);
  assert.equal(shouldReportLookbookPrintWarning(false,true),true);
  assert.equal(shouldReportLookbookPrintWarning(true,true),false);
});

const lookbookPhotoUrl='https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/wedding-dresses/ruffled-dresses/ruffled-dress-11-01.webp';
const fakeResponse=(status=200,bytes=128,declared=bytes)=>({
  ok:status===200,
  status,
  headers:{get:name=>name==='content-length'?String(declared):null},
  arrayBuffer:async()=>new ArrayBuffer(bytes),
});

test('PDF image download retries temporary timeout, then keeps actual photograph bytes',async()=>{
  const calls=[],delays=[];
  const timeout=Object.assign(new Error('The operation timed out'),{name:'TimeoutError'});
  const fetchImage=async (url,options)=>{
    calls.push({url,signal:options.signal});
    if(calls.length===1)throw timeout;
    return fakeResponse();
  };
  const data=await downloadLookbookClientImage(lookbookPhotoUrl,'ruffled-dress-11',
    fetchImage,async ms=>{delays.push(ms);});
  assert(Buffer.isBuffer(data));
  assert.equal(data.length,128);
  assert.deepEqual(delays,[1000]);
  assert.equal(calls.length,2);
  assert(calls.every(call=>call.url===lookbookPhotoUrl));
  assert(calls.every(call=>call.signal));
});

test('PDF image download retries ImageKit throttling and server errors with bounded attempts',async()=>{
  const delays=[];
  let calls=0;
  const data=await downloadLookbookClientImage(lookbookPhotoUrl,'ruffled-dress-11',
    async()=>{
      calls++;
      return calls===1?fakeResponse(429):calls===2?fakeResponse(503):fakeResponse();
    },async ms=>{delays.push(ms);});
  assert.equal(data.length,128);
  assert.equal(calls,3);
  assert.deepEqual(delays,[1000,2000]);
});

test('permanent missing and empty images remain blocking errors, never silently skipped',async()=>{
  let calls=0,delays=0;
  await assert.rejects(
    downloadLookbookClientImage(lookbookPhotoUrl,'ruffled-dress-11',
      async()=>{calls++;return fakeResponse(404);},
      async()=>{delays++;}),
    /Cannot obtain lookbook photograph ruffled-dress-11 after 1 attempt/
  );
  assert.equal(calls,1);
  assert.equal(delays,0);
  await assert.rejects(
    downloadLookbookClientImage(lookbookPhotoUrl,'ruffled-dress-11',
      async()=>fakeResponse(200,0),async()=>{}),
    /Empty lookbook photograph/
  );
  await assert.rejects(
    downloadLookbookClientImage(lookbookPhotoUrl,'ruffled-dress-11',
      async()=>fakeResponse(200,128,25_000_001),async()=>{}),
    /Photo exceeds 25 MB/
  );
});

test('repeated network timeout eventually fails the PDF build after three attempts',async()=>{
  let calls=0;
  const delays=[];
  const timeout=Object.assign(new Error('network stalled'),{name:'TimeoutError'});
  await assert.rejects(
    downloadLookbookClientImage(lookbookPhotoUrl,'ruffled-dress-11',
      async()=>{calls++;throw timeout;},
      async ms=>{delays.push(ms);}),
    /Cannot obtain lookbook photograph ruffled-dress-11 after 3 attempt/
  );
  assert.equal(calls,3);
  assert.deepEqual(delays,[1000,2000]);
});

test('full-resolution PDF PNG preserves every decoded RGB pixel above the old resize cap',async()=>{
 const width=2101,height=2501;
 const pixels=Buffer.alloc(width*height*3);
 for(let i=0;i<pixels.length;i++)pixels[i]=(i*31+(i>>>8))&255;
 const original=await sharp(pixels,{raw:{width,height,channels:3}}).webp({lossless:true}).toBuffer();
 const decoded=await sharp(original).raw().toBuffer();
 const png=await prepareOriginalLookbookPhoto(original,'large-photo');
 const result=await sharp(png).raw().toBuffer({resolveWithObject:true});
 assert.equal(result.info.width,width);
 assert.equal(result.info.height,height);
 assert.deepEqual(result.data,decoded);
});

// Regression for Chromium closing while transferring the full base64 book.
test('PDF export stages full-resolution photos as local files, not inline data URLs',async()=>{
 const {mkdtemp,readFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {pathToFileURL}=await import('node:url');
 const {catalogueProducts}=await import('../src/data/catalogue.ts');
 const {writeLuxuryLookbookDocument}=await import('../src/lib/luxury-lookbook.ts');
 const folder=await mkdtemp(join(tmpdir(),'redcarpert test '));
 try{
  const png=await sharp({create:{width:2101,height:2501,channels:3,background:'#ede6dd'}}).png().toBuffer();
  const images=catalogueProducts.map(p=>({id:p.id,png,width:2101,height:2501}));
  const htmlPath=await writeLuxuryLookbookDocument(folder,catalogueProducts,images,{year:2026,logo:png.subarray(0,8)});
  const html=await readFile(htmlPath,'utf8');
  const srcs=[...html.matchAll(/class="portrait"><img src="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(srcs.length,catalogueProducts.length);
  assert(srcs.every(src=>src.startsWith('file:')&&!src.includes('base64')));
  assert.equal(srcs[0],pathToFileURL(join(folder,'photo-0.png')).href);
  assert.deepEqual(await readFile(join(folder,'photo-0.png')),png);
  assert.deepEqual(await readFile(join(folder,'photo-'+(images.length-1)+'.png')),png);
  assert(html.length<200000,'HTML should stay small regardless of image payload size');
 }finally{await rm(folder,{recursive:true,force:true});}
});
