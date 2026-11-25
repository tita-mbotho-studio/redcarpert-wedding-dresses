import assert from 'node:assert/strict';

/** Verify actual geometry rather than just the breakpoint declarations. */
export async function assertDetailLayout(page,width,label){
 const root=page.locator('#main-container [data-detail-preview]');
 const layout=await root.evaluate(element=>{
  const rect=node=>{
   if(!node)return null;
   const r=node.getBoundingClientRect();
   return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
  };
  const gallery=element.querySelector(':scope > .images[data-detail-gallery]');
  const summary=element.querySelector(':scope > .summary[data-redcarpert-detail-summary]');
  const card=summary?.querySelector('.redcarpert-detail-card');
  const prices=[...element.querySelectorAll('.redcarpert-detail-price-option [data-sale-price],.redcarpert-detail-price-option [data-rental-price]')].map(el=>{
   const bounds=el.getBoundingClientRect();
   const range=document.createRange();
   range.selectNodeContents(el);
   const lines=[...range.getClientRects()].filter(r=>r.width>0&&r.height>0);
   return {text:el.textContent.trim(),fontSize:parseFloat(getComputedStyle(el).fontSize),
    fits:lines.length>0&&lines.every(r=>r.left>=bounds.left-2&&r.right<=bounds.right+2),
    whiteSpace:getComputedStyle(el).whiteSpace};
  });
  return {root:rect(element),gallery:rect(gallery),summary:rect(summary),card:rect(card),
   related:rect(element.querySelector(':scope > .redcarpert-related-dresses')),
   columns:getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length,prices};
 });
 const prefix=width+'px '+label+' ';
 assert(layout.gallery&&layout.summary&&layout.card,prefix+'missing detail components');
 assert(layout.gallery.width>0&&layout.card.width>0,prefix+'collapsed detail components');
 if(width>=768){
  assert.equal(layout.columns,2,prefix+'must retain two columns');
  assert(layout.gallery.right+8<=layout.card.left,prefix+'pricing must be to the right of the photo: '+JSON.stringify(layout));
  assert(layout.card.top<layout.gallery.bottom&&layout.card.bottom>layout.gallery.top,prefix+'pricing and gallery must share a row');
 }else{
  assert.equal(layout.columns,1,prefix+'phones must stack');
  assert(layout.card.top>=layout.gallery.bottom-2,prefix+'pricing must follow gallery');
  assert(Math.abs(layout.card.width-layout.gallery.width)<=2,prefix+'stacked card must fill gallery width');
 }
 assert(layout.card.left>=layout.root.left-2&&layout.card.right<=layout.root.right+2,prefix+'card exceeds product width');
 assert.equal(layout.prices.length,2,prefix+'both price fields must remain');
 assert(layout.prices.every(p=>p.fits&&p.whiteSpace==='nowrap'&&p.fontSize>=18),prefix+'complete readable price amounts must fit: '+JSON.stringify(layout.prices));
 assert.equal(layout.prices[0].fontSize,layout.prices[1].fontSize,prefix+'sale/rental sizes must match');
 if(layout.related){
  assert(layout.related.top>=Math.max(layout.gallery.bottom,layout.summary.bottom)-2,prefix+'related dresses must remain below both columns');
  assert(Math.abs(layout.related.width-layout.root.width)<=2,prefix+'related section must span full width');
 }
}
