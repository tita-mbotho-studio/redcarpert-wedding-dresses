import test from 'node:test';
import assert from 'node:assert/strict';
import { localRequestPath } from '../scripts/lib/request-url.ts';

test('Vite URLs preserve approved base paths and query-independent matching', () => {
  assert.equal(localRequestPath('/redcarpert-wedding-dresses-main/'),'/');
  assert.equal(localRequestPath('/redcarpert-wedding-dresses-main/digital-lookbook/'),'/digital-lookbook/');
  assert.equal(localRequestPath('/redcarpert-wedding-dresses-main/product?orderby=date'),'/product');
  assert.equal(localRequestPath('/@vite/client'),'/@vite/client');
  assert.equal(localRequestPath('/redcarpert-wedding-dresses-main2/'),'/redcarpert-wedding-dresses-main2/');
});

test('malformed and traversal requests fail closed without throwing', () => {
  for (const value of ['/%','/%ZZ','/%E0%A4%A','/redcarpert-wedding-dresses-main/%2E%2E/private','/redcarpert-wedding-dresses-main/../secret','/redcarpert-wedding-dresses-main/%00','/redcarpert-wedding-dresses-main/%5Cetc']) {
    assert.equal(localRequestPath(value),null,value);
  }
});
