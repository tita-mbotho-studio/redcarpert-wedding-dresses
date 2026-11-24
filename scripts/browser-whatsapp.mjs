import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import { catalogueProducts } from '../src/data/catalogue.ts';
import { displaySalePriceForDress, displayRentalPriceForDress } from '../src/lib/pricing.ts';
import { generalFittingMessage } from '../src/lib/whatsapp-messages.ts';

// All WhatsApp handoffs are native links, not website review dialogs.
// Intercept wa.me before network access: never contact or message the business.
const browser=await chromium.launch({args:['--no-sandbox']});
try {
  for(const {route,width,height=900,name,trigger} of [
    {route:'/',width:1440,name:'homepage floating enquiry',trigger:'#redcarpert-floating-whatsapp [data-whatsapp-send]'},
    {route:'/',width:320,name:'small phone floating enquiry',trigger:'#redcarpert-floating-whatsapp [data-whatsapp-send]'},
    {route:'/wedding-moments/',width:375,height:667,name:'mobile floating dismiss',trigger:'#redcarpert-floating-whatsapp [data-whatsapp-send]'},
    {route:'/contact-us/',width:640,name:'wide phone floating enquiry',trigger:'#redcarpert-floating-whatsapp [data-whatsapp-send]'},
    {route:'/product/',width:768,name:'tablet floating enquiry',trigger:'#redcarpert-floating-whatsapp [data-whatsapp-send]'},
    {route:'/about-us/',width:390,name:'mobile About Us fitting',trigger:'.redcarpert-editorial [data-redcarpert-icon-cta="fitting"] [data-whatsapp-send]'},
    {route:'/contact-us/',width:768,name:'tablet Contact Us chat',trigger:'[data-contact-whatsapp-action]'},
    {route:'/contact-us/',width:375,name:'mobile footer social WhatsApp',trigger:'#footer .redcarpert-footer-social-whatsapp'},
    {route:'/product/preview/mermaid-lefa-dress/',width:390,name:'Mermaid dress fitting',trigger:'[data-detail-preview] [data-whatsapp-send]'},
    {route:'/product/preview/ball-gown-02/',width:768,name:'Ball Gown dress fitting',trigger:'[data-detail-preview] [data-whatsapp-send]'},
    {route:'/contact-us/',width:375,name:'mobile footer fitting',trigger:'#footer .redcarpert-footer-book'},
    {route:'/contact-us/',width:390,name:'mobile displayed contact number',trigger:'[data-contact-whatsapp-number]'},
    {route:'/contact-us/',width:1440,name:'desktop contact chat button',trigger:'[data-contact-whatsapp-action]'},
  ]){
    const context=await browser.newContext({viewport:{width,height}});
    await context.route('https://wa.me/**',request=>request.fulfill({
      status:200,contentType:'text/html',
      body:'<!doctype html><html><head><title>WhatsApp test handoff</title></head><body>Offline intercepted handoff</body></html>',
    }));
    const page=await context.newPage();
    await page.goto('http://localhost:4173/redcarpert-wedding-dresses-main'+route,{waitUntil:'domcontentloaded'});
    assert(await page.locator('#redcarpert-floating-whatsapp [data-whatsapp-send]').isVisible(),
      name+' WhatsApp floating CTA must appear on all devices');
    assert(await page.locator('#redcarpert-floating-whatsapp [data-dismiss-whatsapp]').isVisible(),
      name+' separate close X must appear on all devices');

    assert.equal(await page.locator('#enquiry-preview').count(),0,name+' must not render a website message preview');
    const control=page.locator(trigger);
    if(name.includes('contact number')){
      assert.equal((await control.innerText()).trim(),'+27 68 045 8811',
        'visible contact details must show the real Redcarpert WhatsApp Business number');
    }
    if(name.includes('contact chat button')){
      assert.match((await control.innerText()).trim(),/Chat on WhatsApp/,
        'Contact Us must preserve a clearly labelled WhatsApp action');
    }
    assert.equal(await control.evaluate(el=>el.tagName),'A',name+' must use a native direct link');
    // Verify computed colors, not merely the CSS source, across viewport widths.
    const colors=await control.evaluate(el=>{
      const style=getComputedStyle(el);
      return {background:style.backgroundColor,foreground:style.color,border:style.borderTopColor};
    });
    const green='rgb(37, 211, 102)';
    const white='rgb(255, 255, 255)';
    if(name.includes('footer')){
      // The footer stays neutral. No green fill, icon or text treatment.
      assert.notEqual(colors.background,green,name+' footer control must not have a green fill');
      assert.notEqual(colors.foreground,green,name+' footer control must not have green text');
      const glyph=await control.locator('.fa-whatsapp').evaluate(el=>{
        const style=getComputedStyle(el);
        return {background:style.backgroundColor,foreground:style.color};
      });
      assert.notEqual(glyph.background,green,name+' footer icon must not have a green fill');
      assert.notEqual(glyph.foreground,green,name+' footer icon must not be green');
    }else{
      assert.equal(colors.background,green,name+' must use the original WhatsApp green');
      assert.equal(colors.foreground,white,name+' must have a white WhatsApp icon or label');
    }
    assert.equal(await control.getAttribute('target'),'_blank');
    assert.equal(await control.getAttribute('rel'),'noopener noreferrer');
    const href=new URL((await control.getAttribute('href')).replaceAll('&amp;','&'));
    assert.equal(href.hostname,'wa.me');
    assert.equal(href.pathname,'/27680458811');
    const message=href.searchParams.get('text');
    assert(message?.startsWith('Hello Redcarpert Wedding Dresses,\n\n'),
      name+' must start with a readable greeting and blank line');
    if(name.includes('dress fitting')){
      const dress=name==='Mermaid dress fitting'
        ? catalogueProducts.find(d=>d.id==='mermaid-lefa-dress')
        : catalogueProducts.find(d=>d.id==='ball-gown-02');
      assert(dress,'browser test dress fixture is missing');
      assert(message.includes('*Sale Price:* '+displaySalePriceForDress(dress.id)),
        name+' must include the same sale price as its detail page');
      assert(message.includes('*Rental Price Range:* '+displayRentalPriceForDress(dress.id)),
        name+' must include the same rental price range as its detail page');
      assert(message.includes('*Collection:* '),name+' must identify the collection');
      assert(message.includes('available sizes'),name+' must ask about fitting sizes');
      assert(!message.includes('inspiration collection'),name+' must not use a separate inspiration message');
    } else {
      assert.equal(message,generalFittingMessage(),name+' must use the standardized general fitting message');
    }
    const [popup]=await Promise.all([context.waitForEvent('page'),control.click()]);
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(),href.toString(),name+' must open the prepared WhatsApp message immediately');
    assert.equal(await popup.title(),'WhatsApp test handoff');
    await popup.close();

    if(name==='mobile floating dismiss'){
      const close=page.locator('#redcarpert-floating-whatsapp [data-dismiss-whatsapp]');
      await close.click();
      assert(await page.locator('#redcarpert-floating-whatsapp').isHidden(),
        'mobile X must dismiss the widget');
      assert.equal(context.pages().length,1,'mobile X must not open WhatsApp');
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('redcarpert-floating-whatsapp-dismissed')),'1');
      await page.goto('http://localhost:4173/redcarpert-wedding-dresses-main/about-us/',{waitUntil:'domcontentloaded'});
      assert(await page.locator('#redcarpert-floating-whatsapp').isHidden(),
        'mobile dismissal must persist during navigation in the same tab');
    }
    if(width===1440){
      const close=page.locator('#redcarpert-floating-whatsapp [data-dismiss-whatsapp]');
      assert(await close.isVisible(),'desktop floating dismiss X must be visible');
      await close.click();
      assert(await page.locator('#redcarpert-floating-whatsapp').isHidden());
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('redcarpert-floating-whatsapp-dismissed')),'1');
      await page.goto('http://localhost:4173/redcarpert-wedding-dresses-main/about-us/',{waitUntil:'domcontentloaded'});
      assert(await page.locator('#redcarpert-floating-whatsapp').isHidden(),'dismissal must persist across pages');
      const footer=page.locator('#footer .redcarpert-footer-social-whatsapp');
      const [footerPopup]=await Promise.all([context.waitForEvent('page'),footer.click()]);
      await footerPopup.waitForLoadState('domcontentloaded');
      assert.equal(new URL(footerPopup.url()).hostname,'wa.me','footer remains usable after floating CTA dismissed');
      await footerPopup.close();
    }
    await context.close();
    console.log('Direct WhatsApp handoff PASS',width,name);
  }
}finally {await browser.close();}
