import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync('src/components/WhatsAppBrand.css','utf8');
const generation=readFileSync('scripts/generate.ts','utf8');
const modernIcons=readFileSync('src/components/ModernIcons.css','utf8');

test('WhatsApp controls outside the footer use the original green-and-white styling',()=>{
  assert.match(css,/--redcarpert-whatsapp-green:\s*#25D366;/);
  assert.match(css,/--redcarpert-whatsapp-white:\s*#FFFFFF;/);
  assert.match(css,/--redcarpert-whatsapp-hover:\s*#1FB65A;/);
  assert.doesNotMatch(css,/--redcarpert-whatsapp-(?:ink|deep|soft):/,
    'do not use the rejected dark green or pastel text variants');
  for(const selector of [
    '.redcarpert-whatsapp-float-trigger[data-whatsapp-send]',
    'a.button.redcarpert-icon-cta-button[data-whatsapp-send]',
    'a.button.redcarpert-detail-fitting-button[data-whatsapp-send]',
    'a.redcarpert-contact-number[data-whatsapp-send]',
    'a.redcarpert-contact-chat[data-whatsapp-send]',
  ])assert(css.includes(selector),'WhatsApp brand rule missing for '+selector);
  assert(!css.includes('#footer') && !css.includes('.redcarpert-footer-'),
    'WhatsApp brand stylesheet must never override footer colors');
  assert.match(modernIcons,
    /\.redcarpert-footer-social-whatsapp\s*\{\s*color:\s*#f1f1f1;/,
    'footer WhatsApp social icon must retain the same neutral appearance');
  assert.match(modernIcons,
    /\.redcarpert-footer-social-whatsapp:hover\s*\{[^}]*color:\s*#fff;/,
    'footer WhatsApp social hover must remain neutral');
  assert(!css.includes('.redcarpert-lookbook-download > a.button'),'PDF download must keep its own design');
  assert(!css.includes('.redcarpert-whatsapp-float-dismiss[data-whatsapp-send]'),
    'the separate close (X) button must remain neutral');
});

test('brand colors load after component styles in the static generator',()=>{
  const normal=generation.indexOf("'src/components/ModernIcons.css'");
  const branded=generation.indexOf("'src/components/WhatsAppBrand.css'");
  const zoom=generation.indexOf("'src/components/LookbookZoom.css'");
  assert(normal>=0 && branded>normal && zoom>branded,
    'WhatsApp CSS must load after source buttons without affecting PDF zoom');
});
