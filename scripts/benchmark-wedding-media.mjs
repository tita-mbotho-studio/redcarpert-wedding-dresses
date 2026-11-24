/** Optional real-CDN diagnostic. Never called during normal build/test/deploy. */
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import { weddingMomentEvents, flattenWeddingMomentEvents } from '../src/lib/wedding-moments.ts';
import { mediaDeliveryUrl } from '../src/lib/media-delivery.ts';

const photos=flattenWeddingMomentEvents(weddingMomentEvents).filter(item=>item.type==='photo');
if(!photos.length)throw new Error('No Wedding Moments photographs');
const samples=[...new Set([photos[0],photos[Math.floor(photos.length/2)],photos.at(-1)])];
const results=[];
const request=async (item,label,url)=>{
 const start=performance.now();
 const response=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{accept:'image/avif,image/webp,image/*'}});
 if(!response.ok)throw new Error(label+' HTTP '+response.status+' for '+item.id);
 if(!response.headers.get('content-type')?.startsWith('image/'))throw new Error('Non-image response for '+item.id);
 const bytes=Buffer.from(await response.arrayBuffer());
 const ms=Math.round(performance.now()-start);
 const meta=await sharp(bytes).metadata();
 if(!meta.width||!meta.height)throw new Error('Invalid image dimensions for '+item.id);
 results.push({id:item.id,variant:label,width:meta.width,height:meta.height,format:meta.format,
  bytes:bytes.length,elapsedMs:ms,cacheControl:response.headers.get('cache-control'),
  age:response.headers.get('age'),cacheStatus:response.headers.get('x-cache')});
};
for(const item of samples){
 const baseline=item.url+(item.url.includes('?')?'&':'?')+'tr=w-640,h-640,c-at_max,q-72,f-auto';
 await request(item,'previous tile',baseline);
 for(const width of [320,640,960])await request(item,'responsive '+width,mediaDeliveryUrl(item.url,'tile',width));
 await request(item,'responsive 640 repeat',mediaDeliveryUrl(item.url,'tile',640));
}
console.table(results.map(({id,variant,width,height,format,bytes,elapsedMs,age,cacheStatus})=>
 ({id,variant,width,height,format,bytes,elapsedMs,age,cacheStatus})));
await mkdir('.cache/redcarpert-image-preflight',{recursive:true});
await writeFile('.cache/redcarpert-image-preflight/benchmark.json',JSON.stringify(results,null,2)+'\n');
console.log('Measured '+results.length+' CDN responses; timings include this connection and cache state. Repeat requests do not prove browser-cache hits.');
