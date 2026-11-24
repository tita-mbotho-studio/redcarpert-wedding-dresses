import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { catalogueProducts } from '../src/data/catalogue.ts';
import { lookbookPlacements } from '../src/lib/lookbook-placements.ts';

const base = 'http://localhost:4173/redcarpert-wedding-dresses';
const routes = ['/digital-lookbook/', '/about-us/', '/contact-us/'];
const viewports = [
  {width: 1440, height: 900},
  {width: 1024, height: 768},
  {width: 1000, height: 800},
  {width: 768, height: 900},
  {width: 640, height: 800},
  {width: 560, height: 760},
  {width: 390, height: 844},
  {width: 375, height: 667},
  {width: 320, height: 568},
];
const browser = await chromium.launch({args: ['--no-sandbox']});
try {
  for (const {width, height} of viewports) {
    for (const route of routes) {
      const page = await browser.newPage({viewport: {width, height}});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      // CSS geometry is independent of provider availability or consent state.
      await page.route('https://www.google.com/maps/**', r => r.abort());
      await page.route('https://images.pexels.com/**', r => r.abort());
      // CI must not depend on ImageKit availability or the timing of lazy images.
      // Serve deterministic, correctly proportioned test portraits to verify
      // the actual CSS layout without changing any published image URLs.
      await page.route('**/red-carpet-wedding-dresses/about-us/redcarpert-about-us-*.jpg*', async request => {
        const isPaula=request.request().url().includes('redcarpert-about-us-paula.jpg');
        const w=isPaula?1080:899, h=isPaula?1440:1599;
        await request.fulfill({
          status:200,contentType:'image/svg+xml',
          body:'<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><rect width="'+w+'" height="'+h+'" fill="#efe9e3"/></svg>',
        });
      });
      await page.goto(base + route, {waitUntil: 'domcontentloaded'});
      if(route==='/about-us/') {
        const portraits=page.locator('.redcarpert-editorial-team-grid img');
        await portraits.evaluateAll(images=>Promise.all(images.map(image=>{
          image.loading='eager';
          return image.decode();
        })));
        assert.equal(await portraits.count(),6,'all six test portraits must render before checking proportions');
      }
      const metrics = await page.evaluate(() => {
        const wrap = document.querySelector('.redcarpert-editorial');
        const title = document.querySelector('.redcarpert-editorial-page-title h1');
        const banner = document.querySelector('.redcarpert-editorial-page-title');
        const hero = wrap.querySelector('.redcarpert-editorial-hero');
        const panels = [...wrap.querySelectorAll('.redcarpert-editorial-panel')];
        const box = e => {
          const r = e.getBoundingClientRect();
          return {x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom, center:r.x+r.width/2};
        };
        const control = e => ({
          ...box(e),
          fontSize: parseFloat(getComputedStyle(e).fontSize),
          paddingLeft: parseFloat(getComputedStyle(e).paddingLeft),
          whiteSpace: getComputedStyle(e).whiteSpace,
        });
        const range = document.createRange();
        range.selectNodeContents(title);
        const titleText = range.getBoundingClientRect();
        const map = wrap.querySelector('.redcarpert-editorial-map');
        const team = wrap.querySelector('.redcarpert-editorial-team-grid');
        return {
          title: box(title),
          banner: box(banner),
          titleTextCenter: titleText.x + titleText.width / 2,
          hero: box(hero),
          root: box(wrap),
          panels: panels.map(box),
          h2Alignments: [...wrap.querySelectorAll('.redcarpert-editorial-hero h2, .redcarpert-editorial-panel h2, .redcarpert-editorial-story h2')].map(h => getComputedStyle(h).textAlign),
          storyTextAlignments: [...wrap.querySelectorAll('.redcarpert-editorial-story p')].map(p => getComputedStyle(p).textAlign),
          panelCount: panels.length,
          layoutClass: document.querySelector('#content-container')?.className,
          sidebar: Boolean(document.querySelector('#content-container #sidebar')),
          map: map ? box(map) : null,
          mapSrc: map?.querySelector('iframe')?.getAttribute('src') ?? null,
          mapLink: wrap.querySelector('a[href^="https://www.google.com/maps/search/"]')?.href ?? null,
          teamCount: team?.querySelectorAll('figure').length ?? 0,
          teamColumns: team ? getComputedStyle(team).gridTemplateColumns.split(' ').length : 0,
          teamCardBoxes: team ? [...team.querySelectorAll('figure')].map(box) : [],
          teamSources: team ? [...team.querySelectorAll('img')].map(img => img.getAttribute('data-media-original')) : [],
          teamOptimizedSources: team ? [...team.querySelectorAll('img')].map(img => img.getAttribute('src')) : [],
          teamNames: team ? [...team.querySelectorAll('figure figcaption h3')].map(name => name.textContent.trim()) : [],
          teamImageAlts: team ? [...team.querySelectorAll('figure img')].map(image => image.getAttribute('alt')) : [],
          teamImageGeometry: team ? [...team.querySelectorAll('figure img')].map(image => ({
            image: box(image),
            card: box(image.closest('figure')),
            sourceWidth: Number(image.getAttribute('width')),
            sourceHeight: Number(image.getAttribute('height')),
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            aspectRatio: getComputedStyle(image).aspectRatio,
            objectFit: getComputedStyle(image).objectFit,
            backgroundColor: getComputedStyle(image).backgroundColor,
          })) : [],
          actionGroup: wrap.querySelector('.redcarpert-editorial-actions') ? box(wrap.querySelector('.redcarpert-editorial-actions')) : null,
          actionButtons: [...wrap.querySelectorAll('.redcarpert-editorial-actions .redcarpert-editorial-action')].map(box),
          contactCard: (() => {
            const card=wrap.querySelector('.redcarpert-contact-card');
            if(!card)return null;
            const number=card.querySelector('[data-contact-whatsapp-number]');
            return {
              ...box(card),
              number:number?box(number):null,
              numberHref:number?.getAttribute('href'),
              numberText:number?.textContent?.trim(),
              numberWrap:number?getComputedStyle(number).overflowWrap:null,
              numberTextAlign:number?getComputedStyle(number).textAlign:null,
              duplicateCount:card.querySelectorAll('a[href^="https://wa.me/"]').length,
            };
          })(),
          mapContact: (() => {
            const group=wrap.querySelector('.redcarpert-map-call');
            const number=group?.querySelector('[data-contact-phone-call]');
            if(!group||!number)return null;
            return {
              ...box(number),
              group:box(group),
              href:number.getAttribute('href'),
              text:number.textContent.trim(),
              iconClass:number.querySelector('i')?.className,
              background:getComputedStyle(number).backgroundColor,
              foreground:getComputedStyle(number).color,
              textAlign:getComputedStyle(number).textAlign,
              followsDescription:group.previousElementSibling?.textContent.trim()==="We're in Pomona, Kempton Park. This map shows the general area.",
            };
          })(),
          iconCtas: [...wrap.querySelectorAll('[data-redcarpert-icon-cta]')].map(group => {
            const label = group.querySelector('.redcarpert-icon-cta-label');
            const link = group.querySelector('a.redcarpert-icon-cta-button');
            return {
              kind: group.dataset.redcarpertIconCta,
              label: label?.textContent?.trim(),
              labelBox: label ? box(label) : null,
              button: link ? control(link) : null,
              buttonText: link?.textContent?.trim(),
              icon: link?.querySelector('i')?.className,
              iconHidden: link?.querySelector('i')?.getAttribute('aria-hidden'),
              iconBox: link?.querySelector('i') ? box(link.querySelector('i')) : null,
              iconMarginLeft: link?.querySelector('i') ? parseFloat(getComputedStyle(link.querySelector('i')).marginLeft) : null,
              iconMarginRight: link?.querySelector('i') ? parseFloat(getComputedStyle(link.querySelector('i')).marginRight) : null,
              ariaLabel: link?.getAttribute('aria-label'),
              href: link?.getAttribute('href'),
              target: link?.getAttribute('target'),
              download: link?.getAttribute('download'),
            };
          }),
          bookPages: wrap.querySelectorAll('#redcarpert-flipbook [data-book-page]').length,
          scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        };
      });
      assert.equal(metrics.layoutClass, 'content-boxed layout-full', width + 'px ' + route + ' layout must be full width');
      assert.equal(metrics.sidebar, false, width + 'px ' + route + ' should not have a sidebar');
      assert.equal(metrics.h2Alignments.every(a => a === 'center'), true, width + 'px ' + route + ' headings should be centred');
      assert(Math.abs(metrics.hero.center - metrics.root.center) <= 2, width + 'px ' + route + ' hero is off centre');
      assert(Math.abs(metrics.titleTextCenter - metrics.banner.center) <= 3, width + 'px ' + route + ' page title is off centre');
      for (const panel of metrics.panels) {
        assert(Math.abs(panel.center - metrics.root.center) <= 2, width + 'px ' + route + ' panel is off centre');
        assert(panel.width <= metrics.root.width + 1, width + 'px ' + route + ' panel exceeds root width');
      }
      assert.equal(metrics.iconCtas.length,route==='/contact-us/'?0:1,
        route+' must not show redundant fitting controls');
      if(route!=='/contact-us/'){
      const cta=metrics.iconCtas[0];
      assert(cta.labelBox && cta.button,width+'px '+route+' must show a label above an icon link');
      assert.equal(cta.buttonText,'',route+' button itself must be icon-only');
      assert.equal(cta.iconHidden,'true',route+' decorative icon must be hidden from assistive technology');
      assert(cta.button.height>=43.5 && cta.button.height<=48.5,
        width+'px '+route+' must keep the icon touch target compact');
      assert(cta.button.width>=43.5 && cta.button.width<=48.5,
        width+'px '+route+' icon width must stay compact');
      assert(cta.button.x>=-1 && cta.button.right<=width+1,
        width+'px '+route+' icon must fit inside the viewport');
      assert(cta.labelBox.bottom<=cta.button.y+1,
        width+'px '+route+' text must sit above the icon');
      assert(Math.abs(cta.labelBox.center-cta.button.center)<2,
        width+'px '+route+' label and icon must be centred together');
      assert(cta.iconBox,width+'px '+route+' Font Awesome glyph container must exist');
      assert(Math.abs(cta.iconBox.center-cta.button.center)<=1.5,
        width+'px '+route+' Font Awesome icon must be centred horizontally in the button');
      assert(Math.abs((cta.iconBox.y+cta.iconBox.height/2)-(cta.button.y+cta.button.height/2))<=1.5,
        width+'px '+route+' Font Awesome icon must be centred vertically in the button');
      assert.equal(cta.iconMarginLeft,0,
        width+'px '+route+' theme must not add a left icon margin');
      assert.equal(cta.iconMarginRight,0,
        width+'px '+route+' theme must not add a right icon margin');
      if(width<=640)assert(cta.button.fontSize<=18.5,
        width+'px '+route+' icon font must scale down on phones');
      if(route==='/digital-lookbook/'){
        assert.equal(cta.kind,'download');
        assert.equal(cta.label,'Download The Bridal Edit (PDF)');
        assert.equal(cta.ariaLabel,cta.label);
        assert(cta.icon?.includes('fa-solid fa-file-arrow-down'));
        assert.match(cta.href,/^\/redcarpert-wedding-dresses\/digital-lookbook\/Redcarpert-The-Bridal-Edit-\d{4}\.pdf$/);
        assert(cta.download?.endsWith('.pdf'),'PDF button must keep its download attribute');
      }else{
        assert.equal(cta.kind,'fitting');
        assert.equal(cta.label,'Book a Fitting');
        assert.equal(cta.ariaLabel,'Book a Fitting via WhatsApp');
        assert(cta.icon?.includes('fa-brands fa-whatsapp'));
        assert(cta.href?.startsWith('https://wa.me/'),'WhatsApp link must remain direct');
        assert.equal(cta.target,'_blank');
      }
      }
      for (const action of metrics.actionButtons) {
        assert(action.height>=43.5,width+'px '+route+' collection action must be tappable');
        assert(action.width<=210.5,width+'px '+route+' action must not become oversized');
      }
      if (route === '/about-us/') {
        assert(metrics.storyTextAlignments.length>=6 && metrics.storyTextAlignments.every(value=>value==='center'),
          width+'px the entire client-approved Our Story must be centred');
        assert.equal(metrics.actionButtons.length,5,'all five collection links must remain');
        const expectedColumns=width<=640?2:width<=1000?3:5;
        const rows=[];
        for(const action of metrics.actionButtons){
          const existing=rows.find(row=>Math.abs(row[0].y-action.y)<=1);
          if(existing)existing.push(action);else rows.push([action]);
        }
        const expectedRows=expectedColumns===5?[5]:expectedColumns===3?[3,2]:[2,2,1];
        assert.deepEqual(rows.map(row=>row.length),expectedRows,
          width+'px About Us must use five / three-two / two-two-one responsive columns');
        if(rows.at(-1).length===1){
          assert(Math.abs(rows.at(-1)[0].center-metrics.actionGroup.center)<=2,
            width+'px final collection button must be centred');
        }else{
          const last=rows.at(-1);
          const center=(last[0].x+last.at(-1).right)/2;
          assert(Math.abs(center-metrics.actionGroup.center)<=2,
            width+'px partial last button row must be centred');
        }
        assert.equal(metrics.teamCount, 6, 'all six models must be visible');
        assert.deepEqual(metrics.teamNames, ['Shantel', 'Refiloe', 'Olga', 'Mapaseka', 'Defny', 'Paula']);
        assert.deepEqual(metrics.teamSources, ['https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/about-us/redcarpert-about-us-shantel.jpg','https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/about-us/redcarpert-about-us-refiloe.jpg','https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/about-us/redcarpert-about-us-olga.jpg','https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/about-us/redcarpert-about-us-mapaseka.jpg','https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/about-us/redcarpert-about-us-defny.jpg','https://ik.imagekit.io/kw8awoqvwi/red-carpet-wedding-dresses/about-us/redcarpert-about-us-paula.jpg']);
        assert.deepEqual(metrics.teamImageAlts, metrics.teamNames.map(name => 'Portrait of '+name+', Redcarpert team member'));
        assert(metrics.teamOptimizedSources.every((src,i)=>{
          const url=new URL(src);
          return url.hostname==='ik.imagekit.io'
            && url.pathname===new URL(metrics.teamSources[i]).pathname
            && url.searchParams.has('tr');
        }),width+'px About Us model portraits must use optimized ImageKit delivery');
        assert.equal(metrics.teamImageGeometry.length, 6);
        for (const layout of metrics.teamImageGeometry) {
          assert.equal(layout.naturalWidth,layout.sourceWidth,
            width+'px model test image must load at its recorded source width');
          assert.equal(layout.naturalHeight,layout.sourceHeight,
            width+'px model test image must load at its recorded source height');
          assert.equal(layout.aspectRatio, 'auto',
            width+'px team photo must use its natural aspect ratio');
          assert.equal(layout.objectFit, 'fill',
            width+'px team photo must not be letterboxed or cropped by object-fit');
          assert.equal(layout.backgroundColor, 'rgba(0, 0, 0, 0)',
            width+'px team photo must not paint shaded side strips');
          assert(Math.abs(layout.image.height - layout.image.width * layout.sourceHeight / layout.sourceWidth) < 2,
            width+'px team photo must retain full natural proportions');
          assert(Math.abs(layout.image.width - (layout.card.width - 2)) < 2,
            width+'px team photo must fill the full available card width');
        }
        assert(metrics.teamColumns >= 1 && metrics.teamColumns <= 3);
        if (metrics.teamColumns===2) {
          const lastPair=metrics.teamCardBoxes.slice(-2);
          assert.equal(lastPair.length,2);
          assert(Math.abs(lastPair[0].y-lastPair[1].y)<=1,
            width + 'px six model cards must form complete tablet rows');
          assert(Math.abs((lastPair[0].center+lastPair[1].center)/2-metrics.root.center)<=2,
            width + 'px final pair of model cards must be centred on tablet');
        }
      } else if (route === '/contact-us/') {
        assert.equal(metrics.actionButtons.length,1,'Contact Us keeps its browse-dresses action');
        const card=metrics.contactCard, mapButton=metrics.mapContact;
        assert(card?.number && mapButton,width+'px Contact Us must show one WhatsApp team number and one map telephone button');
        assert.equal(card.duplicateCount,1,'the duplicate team chat button must be absent');
        assert(card.width>0 && card.width<=Math.min(550,metrics.hero.width)+1,
          width+'px contact card must adapt to its container');
        assert(card.x>=-1&&card.right<=width+1,width+'px contact card must not overflow the viewport');
        assert(Math.abs(card.center-metrics.hero.center)<3,
          width+'px contact card must remain centered');
        for(const [link,container] of [[card.number,card],[mapButton,mapButton.group]]){
          assert(link.width>0&&link.width<=container.width+1,
            width+'px contact number button must fit within its container');
          assert(link.x>=container.x-1&&link.right<=container.right+1,
            width+'px contact number button must not overflow its container');
          assert(link.height>=44,width+'px contact number button must remain tap-friendly');
          assert(link.width<=width+1,width+'px contact number button must fit the viewport');
        }
        assert.equal(card.numberWrap,'anywhere');
        assert.equal(card.numberTextAlign,'center');
        assert.equal(mapButton.textAlign,'center');
        assert.equal(card.numberText,'+27 68 045 8811');
        assert.equal(mapButton.text,'Call Us');
        assert.equal(mapButton.iconClass,'fa-solid fa-phone');
        assert(card.numberHref?.startsWith('https://wa.me/27680458811?text='));
        assert.equal(mapButton.href,'tel:+27680458811');
        assert.equal(mapButton.background,'rgb(245, 239, 231)','the Call Us button must have a neutral ivory fill');
        assert.equal(mapButton.foreground,'rgb(87, 70, 52)','the Call Us button must have neutral brown text');
        assert(mapButton.followsDescription,'Call Us must be directly under the Pomona text');
        assert(Math.abs(mapButton.center-mapButton.group.center)<=2,
          width+'px map Call Us button must be centered');
        if(width>=390)assert(card.number.width<card.width-10,
          width+'px contact button must fit its text instead of spanning the whole card');
        assert(Math.abs(metrics.actionButtons[0].center-metrics.actionGroup.center)<=2,
          width+'px Contact Us action must stay centered');
        assert.equal(metrics.panelCount, 3);
        assert(metrics.map && metrics.map.width > 200, width + 'px map missing or collapsed');
        assert(Math.abs(metrics.map.center - metrics.root.center) <= 2, width + 'px map is not centred');
        assert(metrics.mapSrc.includes('Pomona%2C%20Kempton%20Park%2C%20Gauteng%2C%20South%20Africa'));
        assert(metrics.mapLink.includes('Pomona'));
      } else {
        assert.equal(metrics.bookPages, lookbookPlacements(catalogueProducts).length+2, 'flippable book must remain intact');
      }
      assert(metrics.scrollWidth <= width+1.5, width + 'px ' + route + ' horizontal overflow: ' + metrics.scrollWidth);
      assert.deepEqual(errors, [], width + 'px ' + route + ' browser errors');
      console.log('Editorial layout PASS',width,route,'panels',metrics.panelCount,'map',Boolean(metrics.map));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
