import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { refineTextHierarchy } from '../src/lib/text-hierarchy.ts';
import { preparePage } from '../scripts/lib/prepare-page.ts';

const flatten = n => typeof n === 'string' ? n : n.children.map(flatten).join('');
const all = nodes => nodes.flatMap(n => typeof n === 'string' ? [] : [n, ...all(n.children)]);
const emphasis = doc => all(doc.nodes).filter(n => /redcarpert-(?:heading|text)-emphasis/.test(n.attrs.class ?? ''));

test('inline emphasis preserves exact wording, attributes, siblings and source immutability', () => {
  const heading = {tag:'h2',attrs:{id:'redcarpert-story-title'},children:['Your Dream Dress Starts Here']};
  const link = {tag:'a',attrs:{href:'/product/'},children:['Your Dream Dress Starts Here']};
  const doc = {route:'/about-us',nodes:[heading,link]};
  const snapshot = JSON.stringify(doc);
  const result = refineTextHierarchy(doc);
  assert.equal(JSON.stringify(doc),snapshot);
  assert.equal(flatten(result.nodes[0]),flatten(heading));
  assert.strictEqual(result.nodes[0].attrs,heading.attrs);
  assert.strictEqual(result.nodes[1],link);
  assert.deepEqual(emphasis(result).map(flatten),['Dream Dress']);
  assert.strictEqual(refineTextHierarchy(result),result,'second pass must be a no-op');
  assert.strictEqual(refineTextHierarchy({...doc,route:'/unrelated'}).nodes,doc.nodes);
});

test('known prepared pages receive selective emphasis without new block or control markup', () => {
  const expected = {
    '/':['YOUR DREAM WEDDING','Wedding Dresses'],
    '/about-us':['Dream Dress','plus sizes'],
    '/contact-us':['wedding dress','by appointment only'],
    '/wedding-moments':['unforgettable moments'],
    '/digital-lookbook':['Wedding Dress Collections'],
  };
  for(const [route,phrases] of Object.entries(expected)){
    const doc=preparePage(route).document;
    const nodes=emphasis(doc);
    assert.deepEqual(nodes.map(flatten).sort(),phrases.sort(),route);
    assert(nodes.every(n=>n.tag==='span'||n.tag==='strong'),route);
    assert(nodes.every(n=>Object.keys(n.attrs).join()==='class'),route);
  }
  assert.equal(emphasis(preparePage('/product').document).length,0);
});

test('shared hierarchy stylesheet is loaded last and changes only text color and weight',()=>{
  const source=readFileSync('scripts/generate.ts','utf8');
  const css=readFileSync('src/styles/TextHierarchy.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  assert.match(source,/'src\/styles\/ContentAlignment\.css','src\/styles\/TextHierarchy\.css'\]/);
  const declarations=[...css.matchAll(/(?:^|[;{])\s*([\w-]+)\s*:/gm)].map(m=>m[1]);
  assert(declarations.length>10);
  assert(declarations.every(name=>['color','font-weight','--redcarpert-text-primary','--redcarpert-text-secondary','--redcarpert-text-accent'].includes(name)),declarations.join(', '));
  const pdf=readFileSync('src/lib/luxury-lookbook.ts','utf8');
  assert.match(pdf,/\.amount\{font:600 14pt\/1\.3 Montserrat,Arial,sans-serif;color:#252525;/);
  assert.match(pdf,/\.amount-label\{font:500 7\.5pt\/1\.3 Montserrat,Arial,sans-serif;color:#636363;/);
});
