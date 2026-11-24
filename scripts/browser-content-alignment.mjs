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
   const footerAlignment=await page.locator('#footer .redcarpert-footer-columns > .col').evaluateAll(columns=>columns.flatMap(column=>{
    const frame=column.getBoundingClientRect();
    const center=(frame.left+frame.right)/2;
    return [...column.querySelectorAll('.redcarpert-footer-heading,.redcarpert-footer-items a')].flatMap(el=>{
     const range=document.createRange();
     range.selectNodeContents(el);
     const rects=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
     if(!rects.length)return [];
     // Group glyphs and wrapped text by rendered line, not by individual span.
     const lines=[];
     for(const rect of rects){
      const row=lines.find(line=>Math.abs(line.y-rect.y)<3);
      if(row){row.left=Math.min(row.left,rect.left);row.right=Math.max(row.right,rect.right);}
      else lines.push({y:rect.y,left:rect.left,right:rect.right});
     }
     // The fitting link is an icon/text flex group; test the group box itself.
     if(el.classList.contains('redcarpert-footer-book')){
      const box=el.getBoundingClientRect();
      return Math.abs((box.left+box.right)/2-center)>3?[el.textContent.trim()]:[];
     }
     return lines.some(line=>Math.abs((line.left+line.right)/2-center)>3)?[el.textContent.trim()]:[];
    });
   }));
   assert.deepEqual(footerAlignment,[],width+'px '+route+' footer wording must center within its own column');
   if(route==='/'&&width<=1000){
    const toggle=page.locator('#header .mobile-nav[aria-expanded="false"]');
    await toggle.waitFor({state:'visible'});
    await toggle.click();
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
