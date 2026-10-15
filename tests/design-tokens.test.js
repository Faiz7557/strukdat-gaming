import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');

test('Every translate() in app.js uses units or zero',()=>{
  for(const [,args] of app.matchAll(/translate\(([^)]*)\)/g)){
    for(const arg of args.split(',').map(s=>s.trim())){
      assert.ok(arg==='0'||/(px|%)$/.test(arg)||arg.includes('${'),`unitless translate argument: ${args}`);
    }
  }
});

test('Only Ubuntu weights 400 and 500 are requested',()=>{
  assert.doesNotMatch(css,/font-weight:\s*(bold|600|700)/);
  assert.doesNotMatch(app,/font-weight="?(600|700|bold)/);
  assert.match(css,/strong,b\{font-weight:500\}/);
});
