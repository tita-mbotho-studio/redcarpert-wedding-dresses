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
  for(const route of allRoutes){
   const url=root+(route==='/'?'/':route+'/');
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});
   assert.equal(response.status(),200,url);
   const issues=await page.evaluate(()=>{
    const visible=el=>el.getClientRects().length>0&&getComputedStyle(el).visibility==='visible';
    const selectors='#main-container :is(h1,h2,h3,h4,h5,h6,p,figcaption,a.button,button,[role="status"],.price,.redcarpert-contact-call), #footer :is(.redcarpert-footer-heading,.redcarpert-footer-items a,.redcarpert-footer-tagline,.copyrights), #header .nav-menu a';
    return [...document.querySelectorAll(selectors)].filter(el=>visible(el)&&el.textContent.trim()&&getComputedStyle(el).textAlign!=='center').map(el=>({text:el.textContent.trim().slice(0,100),alignment:getComputedStyle(el).textAlign}));
   });
   assert.deepEqual(issues,[],width+'px '+route);
   if(route.startsWith('/product/preview/')){
    const metrics=await page.locator('[data-detail-preview]').evaluate(root=>{
     const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,cx:(r.left+r.right)/2,cy:(r.top+r.bottom)/2};};
     const gallery=root.querySelector(':scope > [data-detail-gallery]');
     const frame=gallery.querySelector('[data-dress-frame]');
     const card=root.querySelector('.redcarpert-detail-card');
     const fitting=card.querySelector('.redcarpert-detail-fitting-button');
     const photo=frame.querySelector('[data-gallery-active-image]');
     const related=root.querySelector(':scope > .redcarpert-related-dresses');
     const prices=[...card.querySelectorAll('[data-sale-price],[data-rental-price]')];
     return {root:box(root),gallery:box(gallery),frame:box(frame),card:box(card),fitting:box(fitting),related:related?box(related):null,
      layout:getComputedStyle(root).display,objectFit:getComputedStyle(photo).objectFit,
      photoWidth:box(photo).width,photoHeight:box(photo).height,
      fittingHref:fitting.getAttribute('href'),
      priceOverflow:prices.some(el=>el.scrollWidth>el.clientWidth+1),
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
      hasSizes:/AVAILABLE SIZES/i.test(card.textContent)};
    });
    const label=width+'px '+route;
    assert.equal(metrics.layout,'grid',label+' must use the shared editorial grid');
    assert(metrics.root.width<=1041,label+' detail container exceeds 1040px');
    assert(metrics.card.width<=401&&metrics.frame.width<=401,label+' oversized detail columns');
    assert(metrics.frame.height<=601,label+' oversized dress photograph');
    assert(metrics.frame.height>100&&metrics.photoWidth>100,label+' collapsed photograph');
    assert.equal(metrics.objectFit,'contain',label+' must retain full dress silhouette');
    assert(metrics.fitting.width>=43.5&&metrics.fitting.height>=43.5,label+' fitting tap target too small');
    assert(Math.abs(metrics.fitting.cx-metrics.card.cx)<=2,label+' fitting icon must be centered');
    assert(metrics.fittingHref?.startsWith('https://wa.me/'),label+' missing direct WhatsApp enquiry');
    assert(!metrics.priceOverflow&&!metrics.horizontalOverflow,label+' prices or page overflow');
    assert(!metrics.hasSizes,label+' do not display sizes until supplied');
    if(width>=768){
     assert(metrics.gallery.right+20<=metrics.card.left,label+' desktop columns overlap');
     assert(Math.abs(metrics.gallery.cy-metrics.card.cy)<=3,label+' gallery and card must be vertically balanced');
     assert(Math.abs((metrics.gallery.left+metrics.card.right)/2-metrics.root.cx)<=3,label+' main detail group off-center');
    }else{
     assert(metrics.gallery.bottom<=metrics.card.top,label+' mobile information must follow gallery');
     assert(Math.abs(metrics.gallery.cx-metrics.root.cx)<=3&&Math.abs(metrics.card.cx-metrics.root.cx)<=3,label+' mobile layout off-center');
    }
    if(metrics.related){
     assert(metrics.related.top>=Math.max(metrics.gallery.bottom,metrics.card.bottom),label+' related dresses overlap hero');
     assert(Math.abs(metrics.related.cx-metrics.root.cx)<=3,label+' related section off-center');
    }
   }
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
  }
  await page.close();
  console.log('Global text alignment passed at '+width+'px');
 }
}finally{await browser.close();}
