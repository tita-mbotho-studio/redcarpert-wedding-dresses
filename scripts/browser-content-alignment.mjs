import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const root='http://localhost:4173/redcarpert-wedding-dresses';
const allRoutes=JSON.parse(readFileSync('.generated/routes.json','utf8'));
const representative=allRoutes.filter(route=>!route.startsWith('/product/preview/'));
representative.push('/product/preview/ball-gown-01');
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 for(const width of [320,390,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  for(const route of width===1440?allRoutes:representative){
   const url=root+(route==='/'?'/':route+'/');
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,url);
   const issues=await page.evaluate(()=>{
    const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility==='visible';
    const selectors='#main-container :is(h1,h2,h3,h4,h5,h6,p,figcaption,a.button,button,[role="status"],.price,.redcarpert-contact-call), #footer :is(.redcarpert-footer-heading,.redcarpert-footer-items a,.redcarpert-footer-tagline,.copyrights), #header .nav-menu a';
    return [...document.querySelectorAll(selectors)].filter(el=>visible(el)&&el.textContent.trim()&&getComputedStyle(el).textAlign!=='center').map(el=>({text:el.textContent.trim().slice(0,100),alignment:getComputedStyle(el).textAlign}));
   });
   assert.deepEqual(issues,[],width+'px '+route);
   if(route==='/'&&width<=1000){
    await page.locator('#header .mobile-nav').click();
    const mobile=page.locator('#header .mob-nav-menu');
    await mobile.waitFor({state:'visible'});
    const links=await mobile.locator('a').evaluateAll(els=>els.map(el=>getComputedStyle(el).textAlign));
    assert(links.length>=6&&links.every(value=>value==='center'),'mobile menu labels must be centered');
   }
  }
  await page.close();
  console.log('Global text alignment passed at '+width+'px');
 }
}finally{await browser.close();}
