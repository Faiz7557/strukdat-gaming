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

test('Font sizes come only from the type scale tokens',()=>{
  const raw=[...css.matchAll(/font-size:([^;}]+)/g)].map(m=>m[1].trim()).filter(v=>!/^var\(--t-/.test(v)&&!/^0(!important)?$/.test(v));
  assert.deepEqual(raw,[]);
});

test('Root defines the semantic tokens used by the layout',()=>{
  for(const token of ['--t-meta:12px','--t-label:13px','--t-body:15px','--t-lead:16px','--t-title:18px','--t-section:22px','--t-display:28px','--t-code:13px',
    '--r-control:6px','--r-hud:10px','--r-card:16px','--goal:#b9730f','--goal-ink:#8a5a0b','--goal-pale:#fbf1e0','--structure-line:#2f8aa0','--select-line:#0e9e82'])
    assert.ok(css.includes(token),`missing ${token}`);
});

test('Radius values come from tokens, pills, circles, or zero',()=>{
  const raw=[...css.matchAll(/border-radius:([^;}]+)/g)].map(m=>m[1].trim()).filter(v=>!/^var\(--r-/.test(v)&&!['0','50%','999px'].includes(v));
  assert.deepEqual(raw,[]);
});

test('Neutral colours are consolidated',()=>{
  const unique=new Set([...css.matchAll(/#[0-9a-f]{3,8}\b/gi)].map(m=>m[0].toLowerCase()));
  assert.ok(unique.size<=80,`styles.css still has ${unique.size} unique hex colours`);
});
