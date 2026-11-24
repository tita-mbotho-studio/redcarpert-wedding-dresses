import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = new URL(process.env.REDCARPERT_SITE_ORIGIN);
assert.equal(origin.protocol,'https:');
const base = process.env.REDCARPERT_SITE_BASE;
assert.equal(base,'/');
const root=path.resolve('dist');
const legacy=path.join(root,'redcarpert-wedding-dresses');
const routes=JSON.parse(await readFile('.generated/routes.json','utf8'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.pdf':'application/pdf','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'};
for(const route of routes){
 const html=await readFile(path.join(root,route,'index.html'),'utf8');
 for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)){
  assert(!url.startsWith('/redcarpert-wedding-dresses/'),route+' still uses the legacy prefix: '+url);
  const target=path.join(root,url);
  const info=await stat(target);
  if(info.isDirectory())await stat(path.join(target,'index.html'));
 }
}
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let target=path.resolve(root,'.'+pathname);
  if(target!==root&&!target.startsWith(root+path.sep))throw Error('outside root');
  if((await stat(target)).isDirectory())target=path.join(target,'index.html');
  res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
  res.end(await readFile(target));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const local='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({args:['--no-sandbox']});
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const failures=[];
  page.on('response',r=>{if(r.url().startsWith(local)&&r.status()>=400)failures.push(r.url());});
  for(const route of ['/','/contact-us/','/about-us/','/product/','/digital-lookbook/','/wedding-moments/','/product/preview/ball-gown-01/']){
   const response=await page.goto(local+route,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,route);
   if(route==='/contact-us/'){
    const call=page.locator('[data-contact-phone-call]');
    assert.equal((await call.textContent()).trim(),'Call Us: +27 68 045 8811');
    assert.equal(await call.getAttribute('href'),'tel:+27680458811');
    assert.equal(await call.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
   }
   if(route==='/product/preview/ball-gown-01/'){
    const links=await page.locator('a[data-whatsapp-send]').evaluateAll(els=>els.map(e=>e.href));
    assert(links.some(h=>new URL(h).searchParams.get('text')?.includes(origin.origin+'/product/preview/ball-gown-01/')));
   }
   if(route==='/digital-lookbook/'){
    const href=await page.getByRole('link',{name:'Download The Bridal Edit (PDF)'}).getAttribute('href');
    const pdf=await page.request.get(local+href);
    assert.equal(pdf.status(),200);
    assert((await pdf.body()).subarray(0,5).equals(Buffer.from('%PDF-')));
   }
  }
  assert.deepEqual(failures,[]);
  await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
// Keep previously shared prefixed URLs valid on the new custom domain.
const entries=await readdir(root);
await mkdir(legacy,{recursive:true});
for(const entry of entries)await cp(path.join(root,entry),path.join(legacy,entry),{recursive:true});
console.log('Custom-domain root routes, local assets, telephone, WhatsApp and PDF checked; legacy path alias generated.');
