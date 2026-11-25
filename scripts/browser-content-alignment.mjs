import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const root='http://localhost:4173/redcarpert-wedding-dresses';
const allRoutes=JSON.parse(readFileSync('.generated/routes.json','utf8'));
const categoryRoutes=allRoutes.filter(route=>route.startsWith('/product-category/'));
assert.equal(categoryRoutes.length,5,'all five collection pages must be generated');
const listingRoutes=new Set(['/product',...categoryRoutes]);
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 for(const width of [320,390,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  for(const route of allRoutes){
   pageErrors.length=0;
   const url=root+(route==='/'?'/':route+'/');
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,url);
   // Wait for final font metrics before measuring centered text.
   await page.evaluate(async()=>{await document.fonts.ready;});
   const overflow=await page.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    root:document.documentElement.scrollWidth,
    body:document.body.scrollWidth,
   }));
   assert(Math.max(overflow.root,overflow.body)<=overflow.viewport+2,
     width+'px '+route+' horizontal overflow: '+JSON.stringify(overflow));
   const issues=await page.evaluate(()=>{
    const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility==='visible';
    const selectors='#main-container :is(h1,h2,h3,h4,h5,h6,p,figcaption,a.button,button,[role="status"],.price,.redcarpert-contact-call), #footer :is(.redcarpert-footer-heading,.redcarpert-footer-items a,.redcarpert-footer-tagline,.copyrights), #header .nav-menu a';
    return [...document.querySelectorAll(selectors)].filter(el=>visible(el)&&el.textContent.trim()&&getComputedStyle(el).textAlign!=='center').map(el=>({text:el.textContent.trim().slice(0,100),alignment:getComputedStyle(el).textAlign}));
   });
   assert.deepEqual(issues,[],width+'px '+route);
   // Implementation 82: computed component spacing, not just stylesheet text.
   const spacing=await page.evaluate(()=>{
    const read=(selector,property)=>{const el=document.querySelector(selector);return el?parseFloat(getComputedStyle(el)[property]):null;};
    return {
     captionGap:read('.redcarpert-catalogue-title','rowGap'),
     captionTop:read('.redcarpert-catalogue-title','paddingTop'),
     captionBottom:read('.redcarpert-catalogue-title','paddingBottom'),
     filterGap:read('.redcarpert-catalogue-filter','columnGap'),
     priceGap:read('.redcarpert-detail-price-options','rowGap'),
     priceSeparator:read('.redcarpert-detail-price-option + .redcarpert-detail-price-option','paddingTop'),
     priceLabelGap:read('.redcarpert-detail-price-label','marginBottom'),
     fittingGap:read('.redcarpert-detail-actions.redcarpert-icon-cta','rowGap'),
     contactGap:read('.redcarpert-contact-card','rowGap'),
     footerGap:read('#footer[data-redcarpert-footer] .redcarpert-footer-items','rowGap'),
    };
   });
   if(listingRoutes.has(route)){
    assert.equal(spacing.captionGap,4,width+'px '+route+' card caption gap');
    assert.equal(spacing.captionTop,width<=640?12:16,width+'px '+route+' card caption padding');
    assert.equal(spacing.captionTop,spacing.captionBottom,width+'px '+route+' balanced card caption padding');
   }
   if(route==='/product'){
    assert.equal(spacing.filterGap,width<=640?8:12,width+'px filter gap');
    const selected=page.locator('.redcarpert-catalogue-filter button[aria-pressed="true"]');
    assert.equal(await selected.count(),1,'exactly one selected filter');
    const before=await selected.evaluate(el=>({color:getComputedStyle(el).color,border:getComputedStyle(el).borderTopColor}));
    assert.equal(before.color,'rgb(153, 0, 31)',width+'px active filter text');
    assert.equal(before.border,'rgb(153, 0, 31)',width+'px active filter border');
   }
   if(route.startsWith('/product/preview/')){
    assert(spacing.priceGap>=12&&spacing.priceGap<=16,width+'px '+route+' price group gap');
    assert.equal(spacing.priceGap,spacing.priceSeparator,width+'px '+route+' price separator symmetry');
    assert.equal(spacing.priceLabelGap,4,width+'px '+route+' price label gap');
    assert.equal(spacing.fittingGap,8,width+'px '+route+' fitting label gap');
   }
   if(route==='/contact-us')assert.equal(spacing.contactGap,width<=560?8:12,width+'px contact card gap');
   assert.equal(spacing.footerGap,width<=640?4:8,width+'px '+route+' footer link gap');
   // Implementation 85: computed surfaces must resolve to the shared elevation
   // values; transparent decorative borders still occupy their original space.
   const surfaceIssues=await page.evaluate(()=>{
    const issues=[];
    const probe=document.createElement('div');
    document.body.append(probe);
    const expected=token=>{probe.style.boxShadow='var('+token+')';return getComputedStyle(probe).boxShadow;};
    for(const [selector,token] of [
     ['.redcarpert-detail-card','--redcarpert-shadow-raised'],
     ['.redcarpert-contact-card','--redcarpert-shadow-card'],
     ['.redcarpert-book-shell','--redcarpert-shadow-raised'],
    ]){
     for(const el of document.querySelectorAll(selector)){
      if(getComputedStyle(el).boxShadow!==expected(token))issues.push(selector+' elevation mismatch');
     }
    }
    for(const el of document.querySelectorAll('.redcarpert-editorial-panel,.redcarpert-editorial-steps li')){
     const style=getComputedStyle(el);
     if(style.borderTopWidth!=='1px'||style.borderTopColor!=='rgba(0, 0, 0, 0)')issues.push(el.className+' decorative border mismatch');
    }
    probe.remove();
    return issues;
   });
   assert.deepEqual(surfaceIssues,[],width+'px '+route+' surface consistency');
   if(listingRoutes.has(route)){
    const layout=await page.locator('#main-container #content-container .content-box.pexeto-woo-columns-4').evaluate(frame=>{
     const grid=frame.querySelector('ul.products[data-catalogue-preview]');
     const box=grid.getBoundingClientRect();
     const center=(box.left+box.right)/2;
     const fields=[...frame.querySelectorAll(':scope > h1.page-title,:scope > .woocommerce-result-count')];
     return {
      gridWidth:box.width,
      fields:fields.map(el=>{
       const r=el.getBoundingClientRect();
       const range=document.createRange();
       range.selectNodeContents(el);
       const lines=[...range.getClientRects()].filter(rect=>rect.width>0&&rect.height>0);
       return {text:el.textContent.trim(),float:getComputedStyle(el).cssFloat,alignment:getComputedStyle(el).textAlign,width:r.width,centerError:Math.abs((r.left+r.right)/2-center),lineErrors:lines.map(line=>Math.abs((line.left+line.right)/2-center))};
      }),
      hiddenOrder:frame.querySelector(':scope > .woocommerce-ordering[aria-hidden="true"]')?.getBoundingClientRect().width??0,
     };
    });
    assert.equal(layout.fields.length,route==='/product'?1:2,width+'px '+route+' missing listing heading or introduction');
    for(const field of layout.fields){
     assert.equal(field.float,'none',route+' '+field.text+' must not float');
     assert.equal(field.alignment,'center');
     assert(Math.abs(field.width-layout.gridWidth)<=2,route+' '+field.text+' must occupy the grid width');
     assert(field.centerError<=2,route+' '+field.text+' container is off-center');
     assert(field.lineErrors.length>0&&field.lineErrors.every(error=>error<=3),route+' '+field.text+' painted lines are off-center: '+JSON.stringify(field));
    }
    assert.equal(layout.hiddenOrder,0,route+' hidden ordering placeholder must not occupy layout space');
   }
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
   assert.deepEqual(pageErrors,[],width+'px '+route+' JavaScript errors');
  }
  await page.close();
  console.log('Global text alignment passed at '+width+'px');
 }
}finally{await browser.close();}
