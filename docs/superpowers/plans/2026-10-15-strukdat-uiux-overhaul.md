# Strukdat Gaming · Technical Brief dan Rencana Eksekusi UI/UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah Strukdat Gaming dari *dashboard simulasi* menjadi *game belajar* satu layar. Loop prediksi → aksi → amati → jelaskan terlihat tanpa gulir, dengan level bertingkat, gerak yang menjelaskan, dan sistem visual yang konsisten.

**Architecture:** Tetap HTML/CSS/JS standar tanpa dependensi. DOM yang ada dipindah, bukan ditulis ulang: semua `id` dan atribut `data-*` dipertahankan sehingga `app.js` dan tes tetap terhubung. Logika level baru berada di modul murni `levels.js` (bisa dites tanpa DOM); `app.js` tetap pemilik render dan meneruskan event ke pemeriksa level.

**Tech Stack:** HTML, CSS, JavaScript ES modules; Node `node:test` (DOM sink di `tests/execution-view.test.js`); Playwright opsional (`tests/browser*.cjs`); Python opsional (`tests/practicum-parity.py`).

**Spec:** [`AUDIT-GAMEPLAY.md`](../../../AUDIT-GAMEPLAY.md) §1–19 (temuan, token, skala tipografi, layout, level, prinsip gerak). Baca bersama rencana ini.

---

## Bagian A · Technical Brief

### A1. Masalah

Audit 15 Oktober 2026 (gameplay, layout, style, tipografi, palet, animasi, edukasi) menemukan:

1. **Loop belajar terpecah.** Pada 1440×900, arena mulai di Y=583, aksi cepat Y=1287, feedback Y=1348, linked-list Y=1480, kode Y=1661. Pada 390×844 arena mulai di Y=774, di bawah lipatan.
2. **Gameplay tipis.** Satu misi per ruang, petunjuk selalu memberi langkah persis, prediksi tersembunyi, push butuh formulir 4 isian, nilai return tidak berwujud, Queue dibuka di mode prioritas.
3. **Sistem visual drift.** 157 hex unik (101 di CSS), 12 ukuran font, 14 radius, 13 bayangan; bold palsu (700 pada font yang hanya 400/500); label SVG 5,2px di ponsel.
4. **Warna tanpa makna.** Prioritas pasien memakai tiga biru; warna kotak dari `charCodeAt % 3`; turquoise dipakai untuk lima arti; outline pilihan 1,83:1.
5. **Gerak.** Animasi pop rusak (`translate(0,-65)` tanpa satuan); pengguna keyboard tidak pernah melihat animasi penjelas; reduced motion menghapus semua isyarat; gerak tidak sinkron dengan rekaman kode.
6. **Edukasi.** `peek()` Queue membaca jalur terpilih, sementara Panggil memakai prioritas tertinggi; arah urutan "A–C–D" vs "top → D → C → A"; catatan O(n) perekaman bercampur dengan O(1) operasi; transfer tanpa langkah peek; penafian panjang; tidak ada tahap *explain*.

### A2. Tujuan dan kriteria terima

| # | Kriteria | Cara ukur |
|---|---|---|
| G1 | Pada 1440×900 dan 1280×800: arena (≥80% tingginya), dock aksi, feedback, linked-list, dan kode terlihat tanpa gulir. | `tests/browser-audit.cjs` (Task 4) |
| G2 | Pada 390×844: arena mulai ≤ Y=320. | `tests/browser-audit.cjs` |
| G3 | Teks HTML ≥12px; teks SVG ≥12px setelah skala pada 320–1440px. | `tests/design-tokens.test.js`, `browser-audit.cjs` |
| G4 | Font-size hanya dari token `--t-*`; tidak ada `font-weight` 600/700/bold. | `tests/design-tokens.test.js` |
| G5 | Prioritas pasien: merah/amber/cyan + penanda non-warna; kotak Stack satu warna netral; target misi amber. | `tests/execution-view.test.js` |
| G6 | Pop/dequeue/peek/isEmpty menampilkan nilai return di Baki hasil, termasuk `None`. | `tests/execution-view.test.js` |
| G7 | Pengguna keyboard mendapat animasi arena; reduced motion tetap memberi sorot perubahan. | `tests/execution-view.test.js` + feel-check |
| G8 | 6 level per ruang dengan bintang (★ selesai, ★★ ≤ par, ★★★ ≤ par tanpa petunjuk tingkat 3 dan tanpa prediksi salah). | `tests/levels.test.js` |
| G9 | Petunjuk 3 tingkat; pesan pemulihan selalu terlihat. | `tests/execution-view.test.js` |
| G10 | `peek()`/`isEmpty()` Queue berlabel jalur; HUD menampilkan "Berikutnya dilayani". | `tests/execution-view.test.js` |
| G11 | Semua tes yang ada tetap lulus (20 tes Node saat ini). | `npm test` |

### A3. Non-goal

- Tidak menambah framework, bundler, paket npm, atau font baru.
- Tidak menyimpan progres ke `localStorage`/server; data tetap di memori tab (komitmen PRODUCT.md).
- Tidak mengubah algoritma `model.js` atau cuplikan Python di `execution.js`; tes paritas praktikum harus tetap cocok.
- Tidak membuat mode gelap.
- Tidak mengganti gaya isometrik putih–silver.

### A4. Keputusan arsitektur

| Keputusan | Alasan |
|---|---|
| Pindahkan elemen DOM, pertahankan semua `id`/`data-*`. | `app.js` merender lewat `$('id')`; 20 tes Node dan 2 suite Playwright memakai selector ini. Diff terkecil, risiko terkecil. |
| Override CSS ditambahkan di **akhir** `styles.css` dalam blok berlabel `/* ── v2 · … */`; aturan mati dihapus di Task 12. | `styles.css` berlapis (aturan belakang menimpa depan). Menambah di akhir menjamin urutan cascade. |
| Token baru di `:root`; variabel lama (`--indigo`, `--blue`, `--cyan`, `--teal`, …) tetap ada. | Menghindari penggantian massal yang rawan; token peran ditambahkan di sampingnya. |
| `levels.js` modul murni: data level + `stages(ctx)` + `complete()` + `stars()`. | Bisa dites di Node tanpa DOM; `app.js` tetap pemilik render. |
| Rail kiri disembunyikan ≥541px, tetap jadi navigasi bawah ≤540px. | Menghapus navigasi ganda tanpa membuang navigasi ponsel yang sudah teruji. |
| Label SVG diskalakan oleh `fitSceneText()` berbasis `getScreenCTM()`. | Satu fungsi memperbaiki semua ukuran layar tanpa menggambar ulang dunia. |
| Ponsel memakai kamera default zoom 1.4 + fokus. | Infrastruktur kamera sudah ada (`camera.zoom/focus`). |
| Mode rencana memakai token pembatalan (`planToken`). | Timer yang tertunda tidak boleh menjalankan operasi setelah ruang/level berganti, termasuk di DOM sink yang `clearTimeout`-nya no-op. |

### A5. Peta file

| File | Tanggung jawab | Task |
|---|---|---|
| `styles.css` | Token, skala tipe, layout satu layar, warna peran | 1, 2, 3, 4, 6, 7, 8, 10, 12 |
| `index.html` | Topbar ringkas, stage + HUD, Lensa, Baki hasil, ringkasan level | 1, 4, 6, 7, 9, 10, 11 |
| `app.js` | Render, aksi, gerak, petunjuk, pemuatan level | 1, 3, 5, 6, 7, 8, 9, 10, 11 |
| `levels.js` (baru) | Data 12 level, pemeriksa, bintang | 10 |
| `serve.js` | Rute `/levels.js` | 10 |
| `tests/execution-view.test.js` | DOM sink + tes wiring | 1, 3, 5, 6, 7, 8, 9, 10, 11 |
| `tests/design-tokens.test.js` (baru) | Tes statis CSS/JS | 1, 2 |
| `tests/levels.test.js` (baru) | Tes murni level | 10 |
| `tests/browser-audit.cjs`, `tests/browser.cjs` | Tes layout & interaksi Chromium | 4, 5, 9, 10, 12 |
| `DESIGN.md`, `.impeccable/design.json`, `README.md`, `PRODUCT.md`, `PANDUAN-PENGGUNA.md`, `AUDIT-GAMEPLAY.md` | Dokumentasi | 12 |

### A6. Risiko

| Risiko | Mitigasi |
|---|---|
| Layout satu layar terlalu padat pada 1024×720. | Lensa bergulir di dalam kolomnya; arena punya `clamp()` tinggi minimum. Feel-check di 1024×720. |
| Label SVG yang diperbesar saling tumpang tindih di ponsel. | Skala dibatasi `2.2`, kamera fokus di ponsel, feel-check 320px. |
| Mode rencana (level 6) menjalankan operasi setelah pengguna pindah ruang. | `planToken` + `cancelPlan()` di semua jalur ganti ruang/level/reset (Review Focus #3). |
| Playwright tidak terpasang. | Tes browser opsional; verifikasi manual di Browser pane dengan daftar periksa Task 12. |

---

## Global Constraints

- Tanpa dependensi baru; `package.json` tidak berubah.
- Semua teks UI berbahasa Indonesia; istilah operasi tetap ganda (`Ambil / pop`, `Daftarkan / enqueue`) atau memakai nama operasi Python (`peek()`, `isEmpty()`).
- Dasar putih–silver; empat aksen pengguna `#2F39A9`, `#2E6FA0`, `#49A4BB`, `#15D8B3` tetap dipakai.
- Aksen baru hanya: `--goal #b9730f`, `--goal-ink #8a5a0b`, `--goal-pale #fbf1e0`, `--structure-line #2f8aa0`, `--select-line #0e9e82`.
- Font hanya Ubuntu 400/500 (lokal) dan Consolas; `font-weight` hanya 400 atau 500.
- Skala tipe: `--t-meta 12px`, `--t-label 13px`, `--t-body 15px`, `--t-lead 16px`, `--t-title 18px`, `--t-section 22px`, `--t-display 28px`, `--t-code 13px`.
- Radius: `--r-control 6px`, `--r-hud 10px`, `--r-card 16px`, `999px` (pill), `50%` (lingkaran), `0`.
- Target sentuh ≥44×44px.
- Data hanya di memori tab.
- Python digambarkan sebagai cuplikan, bukan interpreter.
- Setiap `id` dan atribut `data-*` yang ada tetap ada (boleh berpindah tempat).
- `npm test` lulus di akhir setiap task; satu commit per task di branch `uiux-overhaul`.
- Easing: `--ease cubic-bezier(.16,1,.3,1)` (masuk/keluar), `--move cubic-bezier(.65,0,.25,1)` (gerak di layar). Durasi UI ≤300ms; gerak penjelas arena 420–560ms dibagi kecepatan.
- Pesan commit diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Lebar 320px dengan label diperbesar.** Label tidak boleh memicu gulir horizontal; teks SVG tetap ≥12px. Tes: Task 5 (`browser-audit.cjs`).
2. **Aksi beruntun saat animasi berjalan** (dua kali pop cepat). Baki hasil menampilkan nilai terakhir; klon tidak tertinggal. Tes: Task 6 (sink) + feel-check.
3. **Ganti ruang/level/reset saat rencana (level 6) atau putar otomatis berjalan.** Semua timer berhenti; tidak ada operasi yang jalan di ruang lain. Tes: Task 10.
4. **Pengguna keyboard dan reduced motion.** Keyboard tetap mendapat gerak arena; reduced motion mendapat sorot statis. Tes: Task 1 (sink); sorot statis diperiksa lewat feel-check Task 6.
5. **Memuat level ketika eksperimen sudah diubah.** Dialog konfirmasi tetap muncul; Kembali mempertahankan data. Tes: Task 10.

---

## Bagian B · Rencana Eksekusi

### Task 0: Siapkan branch dan baseline

**Files:** tidak ada perubahan kode.

- [ ] **Step 1: Buat branch**

```bash
cd "C:/Uner/Semester 7/Struktur Data/data-structure-lab"
git switch -c uiux-overhaul
```

- [ ] **Step 2: Catat baseline**

Run: `npm test`
Expected: `# pass 20`, `# fail 0`.

- [ ] **Step 3: Commit dokumen audit + rencana**

```bash
git add AUDIT-GAMEPLAY.md docs/superpowers/plans/2026-10-15-strukdat-uiux-overhaul.md
git commit -m "docs: add UI/UX audit and execution plan

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Perbaikan cepat (A1, A2, E2, E3, bold palsu)

**Files:**
- Modify: `app.js:23` (`motionAllowed`), `app.js:201` (`font-weight="600"`), `app.js:276` (`structure-note`), `app.js:285` dan `app.js:318` (teks misi), `app.js:380` (keyframe keluar)
- Modify: `styles.css` (satu `font-weight:bold`, blok di akhir)
- Modify: `index.html` (`.memory-legend`)
- Modify: `tests/execution-view.test.js` (helper `view()`)
- Create: `tests/design-tokens.test.js`

**Interfaces:**
- Produces: `view({reducedMotion})` di tes. Elemen sink punya `animate()`, `getScreenCTM()`, `getBoundingClientRect()`, `classList.add/remove`, `querySelectorAll()`. Task 3–11 memakai helper ini.

- [ ] **Step 1: Perluas DOM sink**

Di `tests/execution-view.test.js`, ganti kepala fungsi `view()` dan factory elemen:

```js
function view({reducedMotion=true}={}) {
  const elements = new Map(), listeners = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      innerHTML:'', textContent:'', value:id==='destination'?'2':'', style:{setProperty(){}}, dataset:{},
      classList:{contains:()=>false,toggle(){},add(){},remove(){}}, setAttribute(){}, getAttribute:()=>null, hasAttribute:()=>false, focus(){}, closest:()=>null,
      showModal(){this.open=true;}, append(){}, remove(){},
      animate:()=>({finished:Promise.resolve(),cancel(){}}),
      getScreenCTM:()=>({a:1,e:0,f:0,inverse(){return this;}}),
      getBoundingClientRect:()=>({x:0,y:0,width:0,height:0,top:0,left:0,right:0,bottom:0}),
      getAnimations:()=>[], querySelector:()=>element('queried-child'), querySelectorAll:()=>[],
      addEventListener:(type,handler)=>listeners.set(`${id}:${type}`,handler),
    });
    return elements.get(id);
  };
```

Di `vm.createContext({...})`, ganti `matchMedia:()=>({matches:true}),` dengan:

```js
    matchMedia:()=>({matches:reducedMotion,addEventListener(){}}),
    DOMPoint:class{constructor(x=0,y=0){this.x=x;this.y=y;}matrixTransform(){return this;}},
```

- [ ] **Step 2: Tulis tes yang gagal**

Tambahkan ke akhir `tests/execution-view.test.js`:

```js
test('Keyboard users still see explanatory arena motion; only reduced motion disables it',()=>{
  const moving=view({reducedMotion:false});
  vm.runInContext('keyboardInput=true',moving.context);
  assert.equal(vm.runInContext('motionAllowed()',moving.context),true);
  const reduced=view({reducedMotion:true});
  assert.equal(vm.runInContext('motionAllowed()',reduced.context),false);
});

test('Order text always names its reading direction and complexity notes stay about the operation',()=>{
  const {element,click,action}=view();
  assert.doesNotMatch(element('structure-note').textContent,/Perekaman/);
  assert.match(element('structure-note').textContent,/push\/pop: O\(1\)/);
  click('start-mission');element('destination').value='1';action({action:'transfer'});
  action({rack:'0'});element('destination').value='1';action({action:'transfer'});
  action({rack:'0'});action({action:'pop'});
  action({rack:'1'});element('destination').value='0';action({action:'transfer'});
  action({rack:'1'});element('destination').value='0';action({action:'transfer'});
  assert.match(element('mission-description').textContent,/top → D → C → A/);
  assert.doesNotMatch(element('mission-description').textContent,/A–C–D/);
});
```

Buat `tests/design-tokens.test.js`:

```js
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
```

- [ ] **Step 3: Jalankan tes, pastikan gagal**

Run: `npm test`
Expected: FAIL pada `Keyboard users…` (`motionAllowed()` → `false`), `Order text…` (teks `Perekaman` masih ada), `Every translate()…` (`translate(0,-65)`), `Only Ubuntu…`.

`npm test` memakai glob `tests/*.test.js`, jadi `design-tokens.test.js` ikut berjalan.

- [ ] **Step 4: Implementasi**

`app.js:23` — ganti:

```js
const motionAllowed = () => !keyboardInput && !document.body.classList.contains('reduced-motion') && !motionPreference.matches;
```

dengan:

```js
// Arena motion explains state changes, so keyboard users keep it; only button transitions follow keyboard mode (CSS).
const motionAllowed = () => !document.body.classList.contains('reduced-motion') && !motionPreference.matches;
```

`app.js:380` — di keyframe klon keluar, ganti `{transform:'translate(0,0)',opacity:.9}` dengan `{transform:'translate(0px,0px)',opacity:.9}` dan `{transform:'translate(0,-65)',opacity:0}` dengan `{transform:'translate(0px,-65px)',opacity:0}`.

`app.js:201` — ganti `font-weight="600"` dengan `font-weight="500"`.

`app.js:276` — ganti isi `structure-note`:

```js
  $('structure-note').textContent=room==='stack'?'Panah next bergerak dari top menuju dasar rak. push/pop: O(1). Cari ID: O(n) karena menelusuri node.':'Panah next bergerak dari front ke rear. enqueue/dequeue: O(1). Batalkan pasien: O(n) karena mencari node.';
```

`app.js:285` — teks misi Stack:

```js
    $('mission-description').textContent=complete?'Berhasil! B keluar dan Rak A kembali: top → D → C → A.':m.active?'Target B ada di Rak A. Gunakan Bantuan; kembalikan C lalu D setelah B diambil.':'Pindahkan penghalang ke rak bantuan, ambil B, lalu pulihkan Rak A: top → D → C → A.';
```

`app.js:318` — teks banner:

```js
    $('achievement').innerHTML=`${icon('check')}<div><strong>Misi selesai.</strong><small>${room==='stack'?'B diambil. Rak A pulih: top → D → C → A.':'P04 selesai. P02 dipanggil sebelum P03.'}</small></div>`;
```

`index.html` — di akhir isi `<p class="memory-legend">`, sebelum `</p>`, tambahkan kalimat:

```html
 Perekaman node menambah O(n) per langkah hanya untuk pembelajaran; operasi pointer inti tetap O(1).
```

`styles.css` — ganti satu-satunya `font-weight:bold` dengan `font-weight:500`, lalu tambahkan di akhir file:

```css
/* ── v2 · perbaikan cepat ───────────────────────────── */
strong,b{font-weight:500}
```

- [ ] **Step 5: Jalankan tes**

Run: `npm test`
Expected: PASS semua (24 tes).

- [ ] **Step 6: Feel-check**

Jalankan `node serve.js`, buka http://127.0.0.1:5174. Pop D: kotak naik ±32px di tengah animasi sambil memudar. Tab ke tombol Pop, tekan Enter: kotak tetap beranimasi.

- [ ] **Step 7: Commit**

```bash
git add app.js styles.css index.html tests/execution-view.test.js tests/design-tokens.test.js
git commit -m "fix: restore pop exit motion, keep arena motion for keyboard, clarify order and complexity text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Token desain dan skala tipografi

**Files:**
- Modify: `styles.css` (`:root` di baris 3; seluruh `font-size`, `border-radius`, hex netral, bayangan)
- Modify: `tests/design-tokens.test.js`

**Interfaces:**
- Produces: variabel CSS `--t-meta`, `--t-label`, `--t-body`, `--t-lead`, `--t-title`, `--t-section`, `--t-display`, `--t-code`, `--r-control`, `--r-hud`, `--r-card`, `--shadow-1`, `--shadow-2`, `--surface-1`, `--line-strong`, `--structure-line`, `--select-line`, `--goal`, `--goal-ink`, `--goal-pale`, `--ref`, `--action`. Dipakai Task 3–12.

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan ke `tests/design-tokens.test.js`:

```js
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
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --test tests/design-tokens.test.js`
Expected: FAIL pada keempat tes baru.

- [ ] **Step 3: Normalisasi mekanis (sebelum menambah token)**

Jalankan sekali dari folder proyek (skrip tidak di-commit). Urutan ini penting: token baru ditambahkan **setelah** pemetaan agar definisi token tidak ikut terganti.

```bash
node -e "
const fs=require('fs');let c=fs.readFileSync('styles.css','utf8');
const fsMap={9:'meta',10:'meta',11:'meta',12:'meta',13:'label',14:'body',15:'body',16:'lead',17:'title',18:'title',21:'section',23:'section',24:'section',25:'section',26:'section',29:'display',30:'display',34:'display'};
c=c.replace(/font-size:(\d+)px/g,(m,n)=>fsMap[n]?'font-size:var(--t-'+fsMap[n]+')':m);
const rMap={2:'control',3:'control',4:'control',5:'control',6:'control',7:'control',8:'hud',9:'hud',10:'hud',12:'card',13:'card',15:'card'};
c=c.replace(/border-radius:(\d+)px/g,(m,n)=>rMap[n]?'border-radius:var(--r-'+rMap[n]+')':m);
const hex={line:['#dce2ed','#dce1ed','#e0e5f0','#d8deea','#d9deea','#d8deed','#d4dbea','#e7eaf1','#e9edf5','#e8ebf3','#e8ebf4','#d9dff4','#e4e8f5'],
'line-strong':['#ccd3ed','#cdd3f2','#bdc7ed','#b1b8ca','#b9bfd4','#c6d4eb'],
'surface-1':['#fafbfe','#fafbfd','#fdfdfe','#fcfcfe','#f7f8fb','#f6f7fc','#f4f5fc','#f4f5fb','#f3f4f8','#f2f5fb','#f0f2f8'],
pale:['#f0f2fc','#e4e8fc']};
for(const [t,list] of Object.entries(hex))for(const h of list)c=c.replace(new RegExp(h+'(?![0-9a-f])','gi'),'var(--'+t+')');
fs.writeFileSync('styles.css',c);"
```

Periksa: `grep -c 'font-size:[0-9]' styles.css` → hanya kemunculan `font-size:0`.

- [ ] **Step 4: Tambahkan token ke `:root`**

Di `styles.css` baris 3, di dalam `:root{…}` sebelum `}` penutup, tambahkan (awali dengan `;`):

```css
;--action:#2f39a9;--ref:#2e6fa0;--structure-line:#2f8aa0;--select-line:#0e9e82;--goal:#b9730f;--goal-ink:#8a5a0b;--goal-pale:#fbf1e0;--surface-1:#fafbfe;--line-strong:#c6d0e2;--t-meta:12px;--t-label:13px;--t-body:15px;--t-lead:16px;--t-title:18px;--t-section:22px;--t-display:28px;--t-code:13px;--r-control:6px;--r-hud:10px;--r-card:16px;--shadow-1:0 6px 20px #2f3a5a10;--shadow-2:0 22px 60px #24356830
```

Lalu di `:root` yang sama, ganti `--shadow:0 8px 30px #29345a08` dengan `--shadow:var(--shadow-1)`.

- [ ] **Step 5: Bayangan**

Run: `grep -o 'box-shadow:[^;}]*' styles.css | sort -u`

Aturan penggantian:
- Nilai diawali `0 0 0` (cincin fokus/titik live) **tetap**.
- Bayangan tombol primer (`0 4px 9px #2f39a911`, `0 5px 12px #2f39a91d`, `0 3px 8px #2f39a918`, `0 5px 12px #2f39a922`) **tetap**.
- Nilai dengan blur 15–30px (`0 4px 15px …`, `0 5px 20px …`, `0 8px 30px …`) → `var(--shadow-1)`.
- Dialog `0 22px 80px …` → `var(--shadow-2)`.

- [ ] **Step 6: Jalankan tes**

Run: `npm test`
Expected: PASS semua. Jika `Neutral colours…` gagal, jalankan `grep -oiE '#[0-9a-f]{3,8}\b' styles.css | tr A-F a-f | sort | uniq -c | sort -rn` dan petakan abu-abu/silver yang selisih tiap kanalnya ≤6 terhadap `#e0e4ee`, `#c6d0e2`, atau `#fafbfe` ke `var(--line)`, `var(--line-strong)`, atau `var(--surface-1)`.

- [ ] **Step 7: Feel-check**

Bandingkan 1440 dan 390 dengan `screenshots/audit/stack-1440.png` dan `stack-390.png`. Teks kecil kini 12px, body 15px. Teks tidak terpotong di tombol rak, chip misi, atau tab ruang.

- [ ] **Step 8: Commit**

```bash
git add styles.css tests/design-tokens.test.js
git commit -m "style: introduce semantic tokens and a seven-step type scale

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Warna bermakna

**Files:**
- Modify: `app.js:9` (`colors`), `app.js:177` (`floor`), `app.js:197` (palet kotak), `app.js:214-217` (`person`), `app.js:229` (warna jalur), `app.js:403` (legenda)
- Modify: `styles.css` (akhir file)
- Test: `tests/execution-view.test.js`

**Interfaces:**
- Produces: konstanta `boxPalette`, `goalPalette`, `priorityShades`, `laneFills`, `laneStrokes` di `app.js`; atribut `data-priority` pada `<g>` pasien.

- [ ] **Step 1: Tulis tes yang gagal**

```js
test('Colour carries meaning: neutral boxes, amber target, triage colours for priorities',()=>{
  const {element,action,click}=view();
  assert.doesNotMatch(element('scene').innerHTML,/#87bbdf|#a0d9e6/,'stack boxes must not use per-id hues');
  click('start-mission');
  assert.match(element('scene').innerHTML,/#c98a1e/i,'mission target uses the goal palette');
  action({room:'queue'});action({mode:'priority'});
  const queue=element('scene').innerHTML;
  assert.match(queue,/#b24555/i,'kritis uses the danger colour');
  assert.match(queue,/#b9730f/i,'darurat uses amber');
  assert.match(queue,/data-priority="kritis"/,'priority has a non-colour marker');
});
```

Mode Queue masih `priority` di task ini, jadi `action({mode:'priority'})` tidak berpengaruh. Setelah Task 8 (FIFO default), aksi ini mengganti mode tanpa dialog karena `edited.queue` masih `false`.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm test`
Expected: FAIL (`#87bbdf` masih ada).

- [ ] **Step 3: Implementasi**

`app.js:9` — ganti `const colors = …;` dengan:

```js
// Colour encodes state, never identity: one neutral box hue, amber for goals, triage colours for patient priority.
const boxPalette = ['#8790e7','#5560c5','#2f39a9'], goalPalette = ['#e9b25a','#c98a1e','#9a6410'];
const priorityShades = [['#d27b86','#b24555'],['#d9a04a','#b9730f'],['#7dbccc','#2f8aa0']];
const laneFills = ['#fbe9ec','#fbf1e0','#e2f4f8'], laneStrokes = ['#b24555','#b9730f','#2f8aa0'];
```

`app.js:197` — ganti `const palette = isTarget?colors[3]:colors[(p.id.charCodeAt(0)+1)%3];` dengan:

```js
      const palette = isTarget?goalPalette:boxPalette;
```

`person()` (`app.js:214-217`):
- Ganti baris `const shades=[[…]][rank];` dengan `const shades=priorityShades[rank];`.
- Pada `<g class="svg-item …"` yang dikembalikan, tambahkan atribut `data-priority="${priorities[rank]}"`.
- Tepat setelah `<circle cx="${x}" cy="${y-60}" r="11" fill="#e4bea0"/>`, sisipkan penanda non-warna:

```js
${rank===0?`<path d="M${x-4} ${y-80}h8m-4-4v8" stroke="#b24555" stroke-width="2.5" stroke-linecap="round"/>`:rank===1?`<path d="M${x} ${y-84}l4 7h-8Z" fill="#b9730f"/>`:''}
```

- Pada label ID (`<rect x="${x-19}" y="${y+10}" … stroke="#cfdaed"/>`), ganti `stroke="#cfdaed"` dengan `stroke="${laneStrokes[rank]}" stroke-width="1.5"`.

`app.js:229` — di `<path class="platform-outline" …>` jalur: ganti `fill="${['#e2e5fb','#e0effa','#e2f4f8'][rank]}"` dengan `fill="${laneFills[rank]}"` dan `stroke="${rank===selectedQueue?'#49a4bb':'#b6c8e5'}"` dengan `stroke="${rank===selectedQueue?'#0e9e82':'#b6c8e5'}"`. Pada `<path … stroke-dasharray="5 6"/>` ganti `stroke="${['#2f39a9','#2e6fa0','#49a4bb'][rank]}"` dengan `stroke="${laneStrokes[rank]}"`.

`app.js:177` (`floor()`) — ganti `stroke="#49a4bb" stroke-width="2"` dengan `stroke="#2f8aa0" stroke-width="2"`.

`app.js:403` — legenda Queue:

```js
'<i style="background:#b24555"></i> Kritis + <i style="background:#b9730f"></i> Darurat ▲ <i style="background:#2f8aa0"></i> Non-darurat'
```

`styles.css` — tambahkan di akhir:

```css
/* ── v2 · warna bermakna ─────────────────────────────── */
.target-ring{stroke:var(--goal);stroke-width:2.5}
.scene-legend .legend-target{background:var(--goal)}
.svg-item.selected .box-top{stroke:var(--select-line);stroke-width:2.5}
.drop-zone .platform-outline{stroke:var(--select-line)}
```

- [ ] **Step 4: Jalankan tes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Feel-check**

Queue mode prioritas: P04 (kritis) merah dengan tanda +, P02/P03 amber dengan segitiga, P01/P05 cyan. Mulai misi Stack: B amber dengan cincin putus-putus amber; kotak lain satu warna indigo.

- [ ] **Step 6: Commit**

```bash
git add app.js styles.css tests/execution-view.test.js
git commit -m "style: make colour encode state and triage priority

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Layout satu layar (desktop, tablet, ponsel)

**Files:**
- Modify: `index.html` (topbar, `.page-heading`, `.warmup`, `.workspace`, `.inspector`, `#execution-lab`)
- Modify: `styles.css` (blok baru di akhir)
- Modify: `tests/browser-audit.cjs`, `tests/browser.cjs` (selector ruang, asersi layout)

**Interfaces:**
- Consumes: token Task 2.
- Produces: `.stage` (membungkus `.scene-wrap`); `aside.inspector.lens` yang berisi `#feedback`, `section.structure`, `details.code-panel`, `section.execution-memory`, `details.lens-controls > #controls`. Task 6 menambah `#result-tray` di `.scene-wrap`; Task 9–10 menambah elemen di `.mission-copy`.

- [ ] **Step 1: Tulis asersi browser yang gagal**

Di `tests/browser-audit.cjs` dan `tests/browser.cjs`, ganti setiap

```js
page.locator(`.rail [data-room="${room}"]`).click()
```

serta `.rail [data-room="stack"]` / `.rail [data-room="queue"]` dengan:

```js
page.locator(`[data-room="${room}"]:visible`).first().click()
```

(dengan `room` diganti `stack`/`queue` literal pada `browser.cjs`).

Di `browser-audit.cjs`, hapus `assert.ok(layout.missionBeforeArena);` dan tambahkan blok ini setelah loop `for(const width of [320,390,768,1024,1440])`:

```js
    for(const [width,height] of [[1440,900],[1280,800],[390,844]]){
      await page.setViewportSize({width,height});
      for(const room of ['stack','queue']){
        await page.locator(`[data-room="${room}"]:visible`).first().click();
        await page.evaluate(()=>scrollTo(0,0));
        const box=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();
          return {scene:r('#scene'),dock:r('#quick-actions'),feedback:r('#feedback'),nodes:r('#nodes'),code:r('#code'),vh:innerHeight};});
        if(width>=1280){
          assert.ok(box.scene.top+box.scene.height*.8<=box.vh,`${room} ${width}: arena below fold`);
          for(const key of ['dock','feedback','nodes','code'])assert.ok(box[key].top<box.vh,`${room} ${width}: ${key} below fold (${box[key].top})`);
        } else assert.ok(box.scene.top<=320,`${room} ${width}: arena starts at ${box.scene.top}`);
        results.push({room,width,height,scene:Math.round(box.scene.top),dock:Math.round(box.dock.top),code:Math.round(box.code.top)});
      }
    }
```

- [ ] **Step 2: Jalankan, pastikan gagal (jika Playwright ada)**

Run: `node tests/browser-audit.cjs`
Expected: FAIL `stack 1440: arena below fold`. Jika muncul `Cannot find module 'playwright'`, lanjutkan dan verifikasi manual di Step 6.

- [ ] **Step 3: Restrukturisasi `index.html`**

Pindahkan elemen berikut; **jangan** mengubah `id` atau `data-*`:

1. **Topbar:** hapus `<small>Belajar lewat aksi.</small>` dari `.wordmark`. Pindahkan `<div class="principle" id="principle"></div>` dari `.page-heading` ke dalam `.header-settings`, sebelum `#mission-score`.
2. **Judul ruang:** pindahkan `<p id="room-description">…</p>` ke dalam `.heading-line`, setelah `#practicum`. `.page-heading` kini hanya berisi `.heading-line`.
3. **Tantangan pemula:** pindahkan seluruh `<section class="warmup" …>…</section>` dari sebelum `.workspace` ke **setelah** penutup `.workspace`, sebelum `#execution-lab`.
4. **Stage:** di dalam `section.simulation`, bungkus `.scene-wrap` dengan `<div class="stage">…</div>`. Pindahkan `#quick-actions` dari `.scene-footer` ke dalam `.scene-wrap` sebagai anak terakhir.
5. **Toolbar:** pindahkan `.toolbar-actions` (kecepatan + Atur ulang) ke dalam `.mission`, setelah `#start-mission`. Pindahkan `<span id="scene-summary">` ke `.mission-header`, setelah `#mission-status`. Hapus sisa `<div class="scene-toolbar">` (berisi `.view-label`, `.live-dot`, `.toolbar-divider`).
6. **Footer arena:** `.scene-footer` (berisi `#scene-caption`, `.scene-legend`, `.controls-link`) diletakkan setelah `.stage`.
7. **Lensa:** ubah `<aside class="inspector" aria-label="Panel kontrol">` menjadi `<aside class="inspector lens" aria-label="Lensa: struktur, kode, dan kontrol">`. Ganti `<h2>Kontrol arena</h2>` di `.inspector-heading` dengan `<h2>Lensa</h2>`. Susun isi aside:
   1. `.inspector-heading`
   2. `#feedback` (dipindah dari `.simulation`)
   3. `section.structure` (dipindah dari `.simulation`)
   4. `details.code-panel` (dipindah dari `.execution-grid`; tetap `open`)
   5. `section.execution-memory` (dipindah dari `.execution-grid`)
   6. `<details class="lens-controls" open><summary>Data kustom &amp; kontrol lengkap</summary><div id="controls" tabindex="-1"></div></details>` — `open` wajib agar selector tes `#controls [data-rack="0"]` tetap terlihat.
8. **Materi:** `#execution-lab` tetap di bawah, berisi `.execution-heading`, `.execution-contract`, `.execution-explanation`, `.foundation-panel`. Ganti teks `<h2 id="execution-title">` menjadi `Materi Bedah Eksekusi`. Hapus `<div class="execution-grid">` yang kini kosong.

- [ ] **Step 4: CSS layout v2**

Tambahkan di akhir `styles.css`:

```css
/* ── v2 · layout satu layar ─────────────────────────── */
@media(min-width:541px){.rail{display:none}.shell{margin-left:0}}
.topbar{height:56px;padding:0 24px}
.wordmark{font-size:var(--t-title);letter-spacing:-.4px}
.room-switch button{padding:8px 16px;font-size:var(--t-label)}
.principle{padding:6px 10px;border-radius:var(--r-hud)}.principle .icon{width:18px;height:18px}
.principle div>span{display:inline;margin-left:6px;font-size:var(--t-meta)}
main{padding:12px 24px 16px}
.page-heading{margin-bottom:12px}
.heading-line{align-items:baseline;gap:12px}
h1{font-size:var(--t-section);letter-spacing:-.3px}
#room-description{margin:0;font-size:var(--t-body);color:var(--muted)}
.workspace{grid-template-columns:minmax(0,1fr) 380px;gap:16px}
.simulation{border-radius:var(--r-card)}
.mission{padding:12px 16px;gap:12px;align-items:center;flex-wrap:wrap}
.mission-symbol,.scenario-note{display:none}
.mission h2{font-size:var(--t-title)}
#mission-description{font-size:var(--t-body);margin-top:2px}
.mission .toolbar-actions{margin-left:auto}
.stage{position:relative}
.scene-wrap{height:clamp(420px,calc(100vh - 256px),720px)}
#scene{height:100%;max-height:none;min-height:0}
.scene-wrap .quick-actions{position:absolute;left:16px;right:16px;bottom:16px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:8px;background:#ffffffee;border:1px solid var(--line);border-radius:var(--r-hud);box-shadow:var(--shadow-1)}
.scene-wrap .quick-actions button{min-height:44px;min-width:96px}
.camera-controls{top:16px;bottom:auto;right:16px}
.scene-hint{top:70px;bottom:auto;left:16px}
.scene-footer{padding:8px 16px}
.lens{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;padding-bottom:16px}
.lens>#feedback{margin:0 16px 12px;border-radius:var(--r-hud)}
.lens .structure{padding:12px 16px;border-top:1px solid var(--line)}
.lens .nodes{flex-wrap:wrap}
.lens .code-panel,.lens .execution-memory{border-top:1px solid var(--line);padding:12px 16px}
.lens .code-panel #code{max-height:220px;overflow:auto}
.lens-controls{border-top:1px solid var(--line);padding:12px 16px}
.lens-controls>summary{font-weight:500;cursor:pointer;min-height:44px;display:flex;align-items:center}
@media(max-width:1050px){
  .workspace{grid-template-columns:1fr}
  .lens{position:static;max-height:none;display:grid;grid-template-columns:1fr 1fr}
  .lens>.inspector-heading,.lens>#feedback,.lens-controls{grid-column:1/-1}
  .scene-wrap{height:55vh}
}
@media(max-width:540px){
  .topbar{height:auto;padding:10px 16px}.principle{display:none}
  main{padding:8px 0 12px}.page-heading{padding:0 16px;margin-bottom:8px}
  #room-description{display:none}
  .simulation{border-radius:0;border-left:0;border-right:0;overflow:visible}
  .mission{padding:10px 16px}.mission-progress{display:none}
  .stage{position:sticky;top:0;z-index:3;background:var(--surface-1)}
  .scene-wrap{height:48vh;min-height:300px}
  #scene{width:100%;margin-left:0}
  .scene-wrap .quick-actions{left:8px;right:8px;bottom:8px;gap:4px;padding:4px}
  .scene-wrap .quick-actions button{min-width:0;flex:1;padding:6px 4px;font-size:var(--t-meta)}
  .lens{display:block}
}
```

`256px` di `.scene-wrap` = topbar 56 + padding 12 + judul 40 + misi 96 + footer 40 + margin 12. Bila Step 6 menunjukkan arena terpotong atau berlebih, ubah angka ini sesuai selisih tinggi yang terukur.

`.simulation{overflow:visible}` di ponsel wajib: `overflow:hidden` pada leluhur mematikan `position:sticky` milik `.stage`.

- [ ] **Step 5: Jalankan tes**

Run: `npm test`
Expected: PASS (sink tidak bergantung pada struktur HTML).

Run (bila Playwright ada): `node tests/browser-audit.cjs`; lalu di terminal lain `node serve.js` dan `node tests/browser.cjs`
Expected: PASS.

- [ ] **Step 6: Verifikasi manual**

Di Browser pane atau DevTools pada 1440×900, 1280×800, 1024×720, 768×1024, 390×844, 320×640, jalankan di konsol:

```js
['#scene','#quick-actions','#feedback','#nodes','#code'].map(s=>[s,Math.round(document.querySelector(s).getBoundingClientRect().top)])
```

Expected: pada ≥1280 semua nilai < `innerHeight`; pada 390 `#scene` ≤ 320; `document.documentElement.scrollWidth <= innerWidth` di semua lebar.

- [ ] **Step 7: Commit**

```bash
git add index.html styles.css tests/browser-audit.cjs tests/browser.cjs
git commit -m "feat: one-screen layout with arena stage, action dock, and lens column

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Label dunia ≥12px dan kamera ponsel

**Files:**
- Modify: `app.js` (fungsi baru `labelScale`, `fitSceneText`, `defaultZoom`; inisialisasi `camera`; pemanggilan di `render`, `applyCamera`, ganti ruang, reset, tombol kamera)
- Modify: `app.js:170` (`svgLabel` menulis `font-size`), `app.js:201` (ID kotak horizontal)
- Test: `tests/execution-view.test.js`, `tests/browser-audit.cjs`

**Interfaces:**
- Produces: `labelScale(ctmA:number, minPx=12, smallest=10, max=2.2):number`; `fitSceneText():void`; `defaultZoom():number`.

- [ ] **Step 1: Tulis tes yang gagal**

```js
test('World labels scale up to stay readable and phones start focused',()=>{
  const {context}=view();
  assert.equal(vm.runInContext('labelScale(1.3)',context),1);
  assert.equal(vm.runInContext('labelScale(0.47)',context),2.2);
  assert.equal(vm.runInContext('labelScale(0.8)',context),1.5);
  assert.equal(vm.runInContext('defaultZoom()',context),1.4,'sink matchMedia matches → phone default');
  assert.equal(vm.runInContext('camera.zoom',view({reducedMotion:false}).context),1,'desktop starts at 100%');
});
```

Di `browser-audit.cjs`, dalam loop `for(const width of [320,390,768,1024,1440])` setelah asersi overflow, tambahkan:

```js
        const smallest=await page.evaluate(()=>Math.min(...[...document.querySelectorAll('#scene text')].filter(t=>t.getBoundingClientRect().height>0).map(t=>parseFloat(getComputedStyle(t).fontSize)*t.getScreenCTM().a)));
        assert.ok(smallest>=11.5,`${room} ${width}: smallest SVG text ${smallest.toFixed(1)}px`);
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm test`
Expected: FAIL `labelScale is not defined`.

- [ ] **Step 3: Implementasi**

Tambahkan setelah `const motionAllowed = …` (`app.js:23`):

```js
const phone = matchMedia('(max-width:540px)');
const defaultZoom = () => phone.matches ? 1.4 : 1;
// Scale SVG text so its smallest size (10 user units) renders at ≥12px; capped to limit overlap.
function labelScale(ctmA, minPx = 12, smallest = 10, max = 2.2) { return Math.min(max, Math.max(1, Math.round(minPx / (smallest * ctmA) * 100) / 100)); }
function fitSceneText() {
  const world = $('world'); if (!world?.getScreenCTM) return;
  const k = labelScale(world.getScreenCTM().a);
  document.querySelectorAll('#scene text').forEach(t => { const base = Number(t.getAttribute('font-size')) || 12; t.style.fontSize = `${base * k}px`; });
}
globalThis.addEventListener?.('resize', fitSceneText);
```

Hapus `const camera = {zoom:1,focus:false};` dari `app.js:19` dan tulis ulang **setelah** blok di atas:

```js
const camera = {zoom:defaultZoom(),focus:false}; camera.focus = camera.zoom > 1;
```

`svgLabel` (`app.js:170`):

```js
function svgLabel(x,y,text,cls='svg-label',anchor='middle') { return `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}" font-size="${cls==='svg-small'?10:12}">${escape(text)}</text>`; }
```

ID kotak (`app.js:201`): hapus `<polygon points="${x-40},${base-47} ${x-12},${base-33} ${x-12},${base-16} ${x-40},${base-30}" fill="#f6f9ff"/>` dan elemen `<text x="${x-26}" … transform="rotate(27 …)">…</text>`, lalu sisipkan di posisi yang sama:

```js
<rect x="${x-15}" y="${base-26}" width="30" height="17" rx="3" fill="#ffffffe0"/><text x="${x}" y="${base-13}" text-anchor="middle" fill="#2f39a9" font-size="11" font-weight="500">${escape(p.id.length>4?p.id.slice(0,3)+'…':p.id)}</text>
```

Panggil `fitSceneText()`:
- di `render()` tepat setelah `const cameraMoved=applyCamera(sameRoom,oldTransform);`
- di akhir `applyCamera()` sebelum `return changed;`

Ganti reset kamera menjadi `camera.zoom=defaultZoom();camera.focus=camera.zoom>1;` pada:
- handler ganti ruang (`button.dataset.room`, sekarang `camera.zoom=1;camera.focus=false;`)
- handler `#reset` (sekarang `camera.zoom=1;camera.focus=false;`)
- listener `#reset-camera` (sekarang `camera.zoom=1;camera.focus=false;applyCamera();`)

Batas bawah `#zoom-out` tetap `1`.

Pada desktop 1440, `ctm.a ≈ 0,95` → `k ≈ 1,26`: label tumbuh ±26% dibanding sekarang. Ini disengaja (label 9,5px → 12px).

- [ ] **Step 4: Jalankan tes**

Run: `npm test`, lalu `node tests/browser-audit.cjs` (bila ada Playwright)
Expected: PASS. Tes yang memeriksa `#zoom-level` = `100%` di desktop tetap lulus karena `phone.matches` false pada ≥541px.

- [ ] **Step 5: Feel-check**

Pada 320×640 dan 390×844: ID kotak dan "4 / 6 barang" terbaca; label tidak saling menimpa secara mengganggu; tidak ada gulir horizontal. Zoom in/out: label tetap ≥12px.

- [ ] **Step 6: Commit**

```bash
git add app.js tests/execution-view.test.js tests/browser-audit.cjs
git commit -m "fix: keep world labels at least 12px and focus the camera on phones

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Baki hasil dan gerak yang menjelaskan (A3, A5, A6, A8)

**Files:**
- Modify: `index.html` (`#result-tray` di `.scene-wrap`)
- Modify: `app.js` (state `lastResult`, `renderResult`, handler peek/empty/pop/call/cancel, `animateScene`, `render`, `endDrag`, `pointerup`, timer banner, `renderFeedback`)
- Modify: `styles.css`
- Test: `tests/execution-view.test.js`

**Interfaces:**
- Produces: `let lastResult = null` dengan bentuk `{operation:string, value:string|null}`; `function renderResult():void`; elemen `#result-tray`. Task 10 me-reset `lastResult` di `loadLevel`.

- [ ] **Step 1: Tulis tes yang gagal**

```js
test('Return values land in the result tray, including None and repeated operations',()=>{
  const {element,action}=view();
  action({action:'pop'});
  assert.match(element('result-tray').innerHTML,/pop\(\) →<\/span> <strong>D<\/strong>/);
  action({action:'pop'});
  assert.match(element('result-tray').innerHTML,/<strong>C<\/strong>/,'second quick pop replaces the first');
  action({action:'peek'});
  assert.match(element('result-tray').innerHTML,/peek\(\)[\s\S]*<strong>B<\/strong>/);
  action({action:'empty'});
  assert.match(element('result-tray').innerHTML,/<strong>False<\/strong>/);
  action({rack:'2'});action({action:'pop'});
  assert.match(element('result-tray').innerHTML,/class="result-none"[\s\S]*None/);
  action({room:'queue'});
  assert.equal(element('result-tray').hidden,true,'tray clears when the room changes');
  action({action:'call'});
  assert.match(element('result-tray').innerHTML,/dequeue\(\)[\s\S]*<strong>P0\d<\/strong>/);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm test`
Expected: FAIL (`result-tray` kosong).

- [ ] **Step 3: HTML + CSS**

`index.html` — di dalam `.scene-wrap`, sebelum `#quick-actions`:

```html
<div id="result-tray" class="result-tray" role="status" aria-live="polite" aria-label="Baki hasil operasi terakhir" hidden></div>
```

Akhir `styles.css`:

```css
/* ── v2 · baki hasil & isyarat perubahan ─────────────── */
.result-tray{position:absolute;left:16px;bottom:84px;display:flex;align-items:center;gap:8px;padding:8px 12px;background:#fff;border:1px solid var(--line-strong);border-radius:var(--r-hud);box-shadow:var(--shadow-1);font-family:Consolas,monospace;font-size:var(--t-code)}
.result-tray strong{font-family:Ubuntu,'Segoe UI',sans-serif;font-size:var(--t-title);color:var(--goal-ink);min-width:28px;text-align:center}
.result-tray.fresh{outline:2px solid var(--goal);outline-offset:2px}
.result-tray .result-none strong{color:var(--muted);border:1px dashed var(--line-strong);border-radius:var(--r-control);padding:0 6px}
.svg-item.changed .box-top,.svg-item.changed .patient-halo{stroke:var(--goal);stroke-width:3}
@media(max-width:540px){.result-tray{left:8px;bottom:64px;padding:4px 8px}}
```

- [ ] **Step 4: JS**

Di deklarasi state (`app.js:13`), tambahkan `let lastResult = null;`.

Tambahkan setelah `function renderLog() {…}`:

```js
function renderResult() {
  const tray=$('result-tray'); if(!lastResult){tray.hidden=true;return;}
  const none=lastResult.value===null;
  tray.hidden=false;
  tray.innerHTML=`<span class="${none?'result-none':''}"><span>${escape(lastResult.operation)} →</span> <strong>${escape(none?'None':lastResult.value)}</strong></span>`;
  tray.classList.add('fresh');setTimeout(()=>tray.classList.remove('fresh'),600);
}
```

Set `lastResult` pada handler aksi di `document.addEventListener('click',…)`:
- `peek`/`empty`: setelah `const result=…`: `lastResult={operation:action==='peek'?'peek()':'isEmpty()',value:result==='None'?null:result};`
- `pop`: setelah `const data=racks[rack].pop();`: `lastResult={operation:'pop()',value:data?.id??null};`
- `call`: setelah `const p=clinic.call();`: `lastResult={operation:'dequeue()',value:p?.id??null};`
- `cancel`: setelah `const p=clinic.cancel(selectedPatient);`: `lastResult={operation:`batalkan(${p.id})`,value:p.id};`

Reset `lastResult=null;` di handler ganti ruang, handler `#reset`, dan handler `#start-mission`.

Di `render()`, sisipkan `renderResult();` **sebelum** `const cameraMoved=applyCamera(sameRoom,oldTransform);` agar posisi baki sudah benar saat klon dianimasikan.

**Klon keluar terbang ke baki.** Di `animateScene`, ganti loop `for(const [id,old] of previous)if(!visible.has(id)){…}` dengan:

```js
  const tray=$('result-tray'),trayBox=tray.hidden?null:tray.getBoundingClientRect();
  for(const [id,old] of previous)if(!visible.has(id)){
    const clone=old.clone;world.append(clone);
    let dx=0,dy=-65;
    if(trayBox&&lastResult?.value===id){dx=(trayBox.x+trayBox.width/2-old.bounds.x-old.bounds.width/2)/scale;dy=(trayBox.y-old.bounds.y-old.bounds.height/2)/scale;}
    clone.animate([{transform:'translate(0px,0px)',opacity:.95},{transform:`translate(${dx*.5}px,${dy*.5-30}px)`,opacity:.9,offset:.5},{transform:`translate(${dx}px,${dy}px)`,opacity:0}],{duration:420/motionSpeed,easing:'cubic-bezier(.65,0,.25,1)'}).finished.then(()=>clone.remove()).catch(()=>clone.remove());
  }
```

**Reduced motion tetap menjelaskan (A3).** Di `render()`, tepat setelah `animateScene(oldPositions,cameraMoved);`:

```js
  if(!motionAllowed()&&lastObject)document.querySelectorAll('#scene [data-entity]').forEach(el=>{if(el.dataset.entity===lastObject)el.classList.add('changed');});
```

(Tidak memakai `CSS.escape` karena DOM sink tidak menyediakannya dan ID berasal dari input pengguna.)

**Banner keluar (A5).** Ganti `achievementTimer=setTimeout(()=>$('achievement').hidden=true,3500);` dengan:

```js
    achievementTimer=setTimeout(()=>{const el=$('achievement');if(!motionAllowed()){el.hidden=true;return;}el.animate([{opacity:1,transform:'translate(-50%,0px)'},{opacity:0,transform:'translate(-50%,-4px)'}],{duration:180,easing:'cubic-bezier(.16,1,.3,1)'}).finished.then(()=>el.hidden=true).catch(()=>el.hidden=true);},3500);
```

**Drag kembali ke asal (A6).** Ganti `endDrag()`:

```js
function endDrag(returnHome=false) {
  if(!drag)return;
  const state=drag;drag=null;state.element.style.opacity='';
  document.body.classList.remove('is-dragging');document.querySelectorAll('.drop-zone').forEach(el=>el.classList.remove('drop-zone'));
  if($('scene').hasPointerCapture(state.pointer))$('scene').releasePointerCapture(state.pointer);
  if(returnHome&&state.ghost&&motionAllowed())state.ghost.animate([{transform:state.ghost.style.transform},{transform:'translate(0px,0px)'}],{duration:200,easing:'cubic-bezier(.16,1,.3,1)'}).finished.then(()=>state.ghost.remove()).catch(()=>state.ghost.remove());
  else state.ghost?.remove();
}
```

Di handler `pointerup`, ganti `const {active,source,destination,id}=drag;endDrag();` dengan:

```js
  const {active,source,destination,id}=drag;endDrag(destination===null||destination===source);
```

**Crossfade feedback (A8).** Di awal `renderFeedback()`:

```js
  const changed=$('feedback').dataset.text!==feedback.text;$('feedback').dataset.text=feedback.text;
```

dan di akhir `renderFeedback()`:

```js
  if(changed&&motionAllowed())$('feedback').animate([{opacity:.35},{opacity:1}],{duration:150,easing:'cubic-bezier(.16,1,.3,1)'});
```

- [ ] **Step 5: Jalankan tes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Feel-check (slow motion)**

DevTools → Animations → 25%:
- Pop D: kotak melengkung ke Baki hasil lalu memudar; baki menampilkan `pop() → D` dengan outline amber 600ms.
- Pop dua kali cepat: dua klon terbang, baki menampilkan nilai kedua; setelah 1 detik `document.querySelectorAll('#world .drag-ghost').length === 0`.
- Centang Gerakan minimal lalu push: kotak baru muncul dengan tepi amber, tanpa gerak.
- Lepas drag di lantai kosong: bayangan meluncur pulang 200ms.

- [ ] **Step 7: Commit**

```bash
git add index.html app.js styles.css tests/execution-view.test.js
git commit -m "feat: result tray for return values and motion that explains under reduced motion

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Sinkron arena ↔ rekaman kode (A4)

**Files:**
- Modify: `app.js` (`traceFocusIds`, `traceAuto`, `renderExecution`, `traceExecution`, listener `#trace-auto`)
- Modify: `index.html` (checkbox `#trace-auto` di `.trace-control`)
- Modify: `styles.css`
- Test: `tests/execution-view.test.js`

**Interfaces:**
- Produces: `traceFocusIds(frame):string[]` — data ID objek yang ditunjuk `top`/`front` dan `new_node` pada frame; `let traceAuto = true`.

- [ ] **Step 1: Tulis tes yang gagal**

```js
test('Each trace frame names the arena objects it points at',()=>{
  const {context,element,listeners}=view();
  element('item-id').value='G07';element('item-name').value='Modul';element('item-weight').value='3';element('item-category').value='Elektronik';
  listeners.get('document:submit')({target:{id:'push-form'},preventDefault(){}});
  const ids=vm.runInContext('trace.steps.map(i=>traceFocusIds(trace.records[i].frame))',context);
  assert.deepEqual(ids[0],['D'],'before node creation only top (D) is referenced');
  assert.ok(ids[1].includes('G07'),'new_node is highlighted once created');
  assert.deepEqual(ids.at(-1),['G07'],'top ends on the pushed item');
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm test`
Expected: FAIL `traceFocusIds is not defined`.

- [ ] **Step 3: Implementasi**

Tambahkan sebelum `function renderExecution()`:

```js
// Map a recorded frame back to arena entities: the structure's entry reference and any freshly created node.
function traceFocusIds(frame) {
  const data = id => frame.nodes.find(n => n.id === id)?.data;
  return [...new Set([frame.refs.top ?? frame.refs.front, frame.refs.new_node].filter(Boolean).map(data).filter(Boolean))];
}
let traceAuto = true;
```

Di `renderExecution()`:
- di dalam cabang `if (!record) {`, sebelum `return;`: `document.querySelectorAll('#scene .trace-focus').forEach(el=>el.classList.remove('trace-focus'));`
- tepat setelah `const { frame, previous } = record;`:

```js
  const focus = new Set(traceFocusIds(frame));
  document.querySelectorAll('#scene [data-entity]').forEach(el => el.classList.toggle('trace-focus', focus.has(el.dataset.entity)));
```

Di `traceExecution()`, setelah `traceIndex = trace.steps[0]; renderTrace();`:

```js
  const current = trace;
  if (traceAuto && motionAllowed()) setTimeout(() => { if (trace === current && !traceTimer) playTrace(); }, 560 / motionSpeed);
```

(Pembanding `trace === current` mencegah auto-play rekaman lama setelah ruang berganti atau operasi baru.)

`index.html` — di `.trace-control`, setelah `#trace-play`:

```html
<label class="trace-auto"><input type="checkbox" id="trace-auto" checked> Putar otomatis</label>
```

`app.js` — dekat listener `#trace-play`:

```js
$('trace-auto').addEventListener('change',event=>{traceAuto=event.target.checked;if(!traceAuto)stopTrace();});
```

Akhir `styles.css`:

```css
/* ── v2 · sinkron kode ↔ arena ───────────────────────── */
.svg-item.trace-focus .box-top,.svg-item.trace-focus .patient-halo{stroke:var(--ref);stroke-width:3}
.trace-auto{display:flex;align-items:center;gap:6px;font-size:var(--t-meta);color:var(--muted);min-height:44px}
```

`render()` menulis ulang SVG setelah setiap operasi, sehingga kelas `trace-focus` diterapkan lagi oleh `renderTrace()` → `renderExecution()` yang sudah dipanggil di akhir `render()`.

- [ ] **Step 4: Jalankan tes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Feel-check**

Push satu barang: setelah kotak mendarat, rekaman diputar otomatis. Pada baris `new_node = Node(data)` kotak baru dan D bertepi biru; pada `self.top = new_node` hanya kotak baru. Matikan "Putar otomatis": rekaman tidak berjalan sendiri.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html styles.css tests/execution-view.test.js
git commit -m "feat: highlight arena objects referenced by each trace frame and auto-play traces

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Gesekan gameplay dan kejelasan Queue (push satu tap, FIFO default, waktu di dock, E1, E7)

**Files:**
- Modify: `app.js` (`nextSupply`, `pushItem`, `registerPatient`, `nextServedId`, cabang klik satu tap, `renderHUD`, `queueMode`, `renderQueueControls`, handler peek/empty, handler `submit`)
- Modify: `styles.css`
- Modify: `tests/execution-view.test.js` (tes baru + penyesuaian tes lama)

**Interfaces:**
- Produces: `nextSupply():object`, `pushItem(data):void`, `registerPatient(input:{id,name,priority}):void`, `nextServedId():string`, `patientNames:string[]`. Task 10 memakai `missions.stack.supply` / `missions.queue.supply`.

- [ ] **Step 1: Tulis tes yang gagal**

```js
test('One-tap push and register use generated data and the same model path as the forms',()=>{
  const {context,element,action}=view();
  action({quickPush:'true'});
  assert.equal(vm.runInContext('racks[0].peek().id',context),'G07');
  assert.match(element('feedback').innerHTML,/push\(G07\) berhasil/);
  action({room:'queue'});
  assert.equal(vm.runInContext('queueMode',context),'fifo','Queue opens in basic FIFO');
  action({quickRegister:'true'});
  assert.equal(vm.runInContext('clinic.queues[2].values().at(-1).id',context),'P06');
});

test('Queue peek and isEmpty name their lane; the next served patient is shown separately',()=>{
  const {element,action}=view();
  action({room:'queue'});action({mode:'priority'});
  action({action:'peek'});
  assert.match(element('feedback').innerHTML,/peek\(\) jalur Darurat → P02/);
  assert.match(element('controls').innerHTML,/Berikutnya dilayani: <strong>P04<\/strong>/);
  assert.match(element('controls').innerHTML,/isEmpty\(\) Darurat/);
});
```

Sesuaikan tes lama yang memuat `action({room:'queue'});action({action:'call'});` lalu `action({mode:'fifo'});decide('cancel');` (sekitar baris 165–171). Ganti blok itu dengan:

```js
  action({room:'queue'});action({mode:'priority'});action({action:'call'});
  action({mode:'fifo'});decide('cancel');
  assert.equal(vm.runInContext('queueMode',context),'priority');
  assert.equal(vm.runInContext('clinic.active.patient.id',context),'P04');
  action({mode:'fifo'});decide('replace');
  assert.equal(vm.runInContext('queueMode',context),'fifo');
  assert.equal(vm.runInContext('clinic.active',context),null);
```

`action({mode:'priority'})` berjalan tanpa dialog karena `edited.queue` masih `false`; setelah `call`, `edited.queue` menjadi `true` sehingga pergantian ke FIFO memicu dialog.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm test`
Expected: FAIL (`racks[0].peek().id` = `D`, `queueMode` = `priority`).

- [ ] **Step 3: Refaktor push dan registrasi**

Tambahkan sebelum `function run(operation)`:

```js
function nextSupply() {
  if(missions.stack.supply?.length)return missions.stack.supply.shift();
  return item(`G${String(serial).padStart(2,'0')}`,'Modul cadangan',1+serial%4);
}
function pushItem(data) {
  if(racks.flatMap(r=>r.values()).some(p=>p.id===data.id))throw new Error('ID barang sudah digunakan. Isi ID yang berbeda.');
  racks[rack].push(data);serial++;
  for(const id of ['item-id','item-name','item-weight','item-category'])delete drafts.stack[id];
  selectedItem=data.id;lastObject=data.id;
  traceExecution([{execution:racks[rack].lastExecution,context:`${rackNames[rack]} · push`}]);
  notify(`push(${data.id}) berhasil. Top ${rackNames[rack]} sekarang ${data.id}; berat ${racks[rack].weight} kg.`,false,`push(${data.id})`);
}
const patientNames=['Fajar','Gita','Hadi','Intan','Joko','Kirana','Lutfi','Maya'];
function registerPatient(input) {
  const priority=queueMode==='fifo'?'non-darurat':input.priority,rank=priorities.indexOf(priority),q=clinic.queues[rank];
  const p=clinic.register({...input,priority});patientSerial++;drafts.queue={};selectedPatient=p.id;selectedQueue=rank;lastObject=p.id;
  traceExecution([{execution:q.lastExecution,context:`Jalur ${priorityNames[rank]} · enqueue`}]);
  if(missions.queue.active&&p.id==='P04'&&priority==='kritis')missions.queue.critical=true;
  notify(`${p.id} masuk dari rear ${queueMode==='fifo'?'antrean FIFO':'jalur '+priorityNames[rank]}. Estimasi tunggu ${clinic.estimate(p.id)} menit berdasarkan antrean saat ini.`,false,`enqueue(${p.id})`);
}
const nextServedId=()=>clinic.queues.find(q=>!q.isEmpty())?.peek()?.id??'None';
```

Di handler `submit`, ganti seluruh badan cabang `push-form` dengan:

```js
      pushItem(item($('item-id').value.trim(),$('item-name').value.trim(),Number($('item-weight').value),$('item-category').value));
```

dan seluruh badan cabang `register-form` dengan:

```js
      registerPatient({id:$('patient-id').value.trim(),name:$('patient-name').value.trim(),priority:$('patient-priority').value});
```

Di handler `click`, sebagai baris pertama setelah pemeriksaan `suppressClick`:

```js
  const tap=event.target.closest('[data-quick-push],[data-quick-register]');
  if(tap&&(tap.dataset.quickPush||tap.dataset.quickRegister)){run(()=>tap.dataset.quickPush?pushItem(nextSupply()):registerPatient({id:missions.queue.supply?.shift()??`P${String(patientSerial).padStart(2,'0')}`,name:patientNames[patientSerial%patientNames.length],priority:priorities[selectedQueue]}));return;}
```

Pemeriksaan `tap.dataset.quickPush||tap.dataset.quickRegister` wajib: sink mengembalikan objek `{dataset}` untuk selector apa pun, sehingga tanpa pemeriksaan ini setiap aksi tes akan mendaftarkan pasien.

- [ ] **Step 4: Dock aksi dan FIFO default**

`app.js:11` — ganti `let queueMode = 'priority'` dengan `let queueMode = 'fifo'`.

`renderHUD()` — ganti isi `quick-actions` Stack:

```js
    $('quick-actions').innerHTML=`<button class="primary" data-quick-push="true">${icon('plus')}Push</button><button class="secondary" data-quick="pop">${icon('up')}Pop</button><button class="secondary" data-quick="peek">${icon('eye')}Peek</button><button class="secondary" data-quick="empty">isEmpty?</button><button class="secondary" data-quick="transfer">${icon('arrow')}${rackNames[dest]}</button>`;
```

dan Queue:

```js
  }else $('quick-actions').innerHTML=`<button class="primary" data-quick-register="true">${icon('plus')}Daftar</button><button class="secondary" data-quick="call" ${clinic.active?'disabled':''}>${icon('arrow')}Panggil</button><button class="secondary" data-quick="next-event" ${clinic.active?'':'disabled'}>Selesaikan</button><button class="secondary" data-quick="advance">+1 menit</button><button class="secondary" data-quick="peek">${icon('eye')}Peek</button>`;
```

`[data-quick="empty"]` dan `[data-quick="advance"]` meneruskan klik ke `#controls [data-action="empty"]` dan `#controls [data-action="advance"]` yang sudah ada.

- [ ] **Step 5: Label jalur (E1, E7)**

Di `renderQueueControls()`, ganti

```js
<div class="operation-row"><button class="secondary" data-action="peek">${icon('eye')}Lihat / peek</button><button class="secondary" data-action="empty">isEmpty()</button></div>
```

dengan:

```js
<p class="service-next">Berikutnya dilayani: <strong>${escape(nextServedId())}</strong></p><div class="operation-row"><button class="secondary" data-action="peek">${icon('eye')}peek() ${queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}</button><button class="secondary" data-action="empty">isEmpty() ${queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}</button></div>
```

Di handler `peek`/`empty`, ganti panggilan `notify(\`${action}() → ${result}. …\`,false,\`${action}()\`);` dengan:

```js
      const lane=room==='stack'?rackNames[rack]:`jalur ${queueMode==='fifo'?'FIFO':priorityNames[selectedQueue]}`;
      notify(`${action==='peek'?'peek()':'isEmpty()'} ${lane} → ${result}. Isi tetap sama.${room==='queue'&&queueMode!=='fifo'?` Berikutnya dilayani: ${nextServedId()}.`:''}`,false,`${action}()`);
```

Akhir `styles.css`:

```css
.service-next{margin:8px 0;font-size:var(--t-body)}.service-next strong{color:var(--ref)}
```

- [ ] **Step 6: Jalankan tes**

Run: `npm test`
Expected: PASS. Jika tes lama mencocokkan teks peek lama (misalnya `/peek\(\) → D/`), perbarui polanya ke `/peek\(\) Rak A → D/`.

- [ ] **Step 7: Commit**

```bash
git add app.js styles.css tests/execution-view.test.js
git commit -m "feat: one-tap push and register, FIFO-first queue, lane-labelled peek and next patient

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Petunjuk bertingkat dan prediksi di depan

**Files:**
- Modify: `app.js` (`missionHint`, blok hint di `renderMission`, cabang klik `data-hint`, state misi, `predictionHTML` dipindah, penghitung prediksi salah)
- Modify: `index.html` (`#mission-predict`, `#mission-hint`)
- Modify: `tests/execution-view.test.js`, `tests/browser-audit.cjs`

**Interfaces:**
- Produces: `missionHint():{concept?:string, direction?:string, step:string, recovery?:boolean}`; `missions[room].hintLevel:0..3`; `missions[room].wrongPredictions:number`; elemen `#mission-hint`, `#mission-predict`. Task 10 memakai `missionHint().step` untuk level `s3` dan `q5`.

- [ ] **Step 1: Tulis tes yang gagal**

```js
test('Hints reveal concept, then direction, then the exact step; recovery is always visible',()=>{
  const {context,element,click,action}=view();
  click('start-mission');
  assert.equal(element('mission-next').textContent,'');
  action({hint:'true'});
  assert.match(element('mission-next').textContent,/Hanya barang top/);
  action({hint:'true'});
  assert.match(element('mission-next').textContent,/Ada 2 barang di atas B/);
  action({hint:'true'});
  assert.match(element('mission-next').textContent,/Pindahkan D dari Rak A ke Bantuan/);
  assert.equal(vm.runInContext('missions.stack.hintLevel',context),3);
  const other=view();other.click('start-mission');other.action({action:'pop'});
  assert.match(other.element('mission-next').textContent,/D sudah keluar.*Ulangi misi/,'recovery without asking');
});
```

Perbarui tes lama `Stack mission hints follow blockers on Rak B…`: tepat setelah `click('start-mission');` di baris pertama tes, tambahkan `vm.runInContext('missions.stack.hintLevel=3',context);`.

Di `tests/browser-audit.cjs` (asersi `#mission-next` … `/C dari Rak B/`), tambahkan sebelum asersi: `for(let i=0;i<3;i++)await page.locator('#mission-hint').click();` — tetapi hanya setelah misi dimulai dan sebelum langkah pertama; pindahkan tiga klik ini tepat setelah klik `#start-mission` pada skenario tersebut.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm test`
Expected: FAIL (`mission-next` langsung berisi "Langkah berikut…").

- [ ] **Step 3: Implementasi**

Tambahkan sebelum `function renderMission()`:

```js
function missionHint() {
  const m=missions[room];
  if(room==='stack'){
    const location=id=>racks.findIndex(s=>s.values().some(p=>p.id===id));
    const missing=['A','C','D',...(!m.removed?['B']:[])].find(id=>location(id)<0);
    if(missing)return {recovery:true,step:`${missing} sudah keluar dari arena. Ulangi misi untuk memulihkan skenario.`};
    const concept='Hanya barang top yang bisa diambil. Barang di atas target harus dipindah dulu, lalu dikembalikan dengan urutan terbalik.';
    if(!m.removed){
      const source=location('B'),blockers=racks[source].values().findIndex(p=>p.id==='B');
      return {concept,direction:blockers?`Ada ${blockers} barang di atas B pada ${rackNames[source]}.`:`B sudah menjadi top ${rackNames[source]}.`,
        step:racks[source].peek()?.id==='B'?`Ambil B dari ${rackNames[source]}.`:`Pindahkan ${racks[source].peek().id} dari ${rackNames[source]} ke ${source===2?'Rak B':'Bantuan'}.`};
    }
    const target=['D','C','A'].findLast(id=>location(id)!==0);
    if(!target)return {recovery:true,step:'Urutan Rak A belum tepat. Ulangi misi dan kembalikan C sebelum D.'};
    const source=location(target),top=racks[source].peek().id;
    return {concept,direction:`Rak A harus kembali top → D → C → A; ${target} belum di Rak A.`,
      step:top===target?`Kembalikan ${target} dari ${rackNames[source]} ke Rak A.`:`Pindahkan ${top} dari ${rackNames[source]} ke ${source===2?'Rak B':'Bantuan'} agar ${target} dapat diambil.`};
  }
  const concept='Pemanggilan selalu mengambil front dari jalur prioritas tertinggi yang berisi. Di dalam satu jalur berlaku FIFO.';
  const step=!m.critical?'Daftarkan P04 dengan tingkat kritis.':!m.servedCritical?(clinic.active?'Majukan ke kejadian berikut untuk menyelesaikan pelayanan.':'Panggil P04 dari jalur kritis.'):!m.fifo?'Panggil P02; P03 datang setelahnya.':'Pilih P01 lalu batalkan antreannya.';
  const direction=!m.critical?'Belum ada pasien kritis di antrean.':!m.servedCritical?'P04 harus selesai dilayani sebelum pasien lain.':!m.fifo?'P02 dan P03 sama-sama darurat; siapa yang datang lebih dulu?':'Satu pasien non-darurat perlu dibatalkan.';
  return {concept,direction,step};
}
```

Di `renderMission()`, ganti seluruh blok dari `let hint='';` sampai `$('mission-next').textContent=hint?…:'';` dengan:

```js
  let hint='';
  if(m.active&&!complete){
    const h=missionHint(),level=m.hintLevel??0;
    hint=h.recovery?h.step:level>=3?`Langkah berikut: ${h.step}`:level===2?h.direction:level===1?h.concept:'';
  }
  $('mission-next').textContent=hint;
  $('mission-hint').hidden=!m.active||complete||(m.hintLevel??0)>=3;
  $('mission-hint').textContent=`Petunjuk (${(m.hintLevel??0)+1}/3)`;
  $('mission-predict').innerHTML=predictionHTML();
```

`index.html` — di `.mission-copy`, setelah `<p id="mission-next" class="mission-next"></p>`:

```html
<div id="mission-predict"></div><button class="text-button" id="mission-hint" data-hint="true" hidden>Petunjuk (1/3)</button>
```

Di handler `click`, tambahkan `[data-hint]` ke selector `button` (`event.target.closest('[data-room],…')`), lalu tambahkan cabang segera setelah `if(!button)return;`:

```js
  if(button.dataset.hint){const m=missions[room];m.hintLevel=Math.min(3,(m.hintLevel??0)+1);renderMission();return;}
```

Di handler `#start-mission`, tambahkan `hintLevel:0,wrongPredictions:0` ke objek misi kedua ruang:

```js
  if(room==='stack'){missions.stack={active:true,removed:false,cleared:false,hintLevel:0,wrongPredictions:0};seedStack(true);}else{queueMode='priority';missions.queue={active:true,critical:false,servedCritical:false,fifo:false,cancelled:false,hintLevel:0,wrongPredictions:0};seedQueue(true);}
```

Hapus `${predictionHTML()}` dari akhir `renderStackControls()` dan `renderQueueControls()`.

Di handler `data-predict`, setelah `const correct=…;` tambahkan:

```js
    if(!correct)missions[room].wrongPredictions=(missions[room].wrongPredictions??0)+1;
```

- [ ] **Step 4: Jalankan tes**

Run: `npm test`
Expected: PASS. Tes prediksi lama (`action({predict:'D'})`) tetap lulus karena handler tidak berubah.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html tests/execution-view.test.js tests/browser-audit.cjs
git commit -m "feat: three-tier hints and prediction in the mission strip

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Level, bintang, mode rencana, dan pertanyaan *explain*

**Files:**
- Create: `levels.js`
- Create: `tests/levels.test.js`
- Modify: `serve.js` (rute `/levels.js`)
- Modify: `app.js` (import, state level, `loadLevel`, event, `renderMission`, mode rencana, cabang klik)
- Modify: `index.html` (`#level-select`, `#plan-panel`, `#level-summary`)
- Modify: `styles.css`
- Modify: `tests/execution-view.test.js`, `tests/browser.cjs`, `tests/browser-audit.cjs`

**Interfaces:**
- Consumes: `nextSupply()`, `registerPatient()`, `patientNames` (Task 8); `missionHint()` (Task 9); `lastResult` (Task 6).
- Produces (`levels.js`):
  - `export const levels = { stack: Level[6], queue: Level[6] }`
  - `Level = { id, title, goal, par, setup, supply?, planMode?, stages(ctx):[string,boolean][], hints:{concept:string, direction(ctx):string}, explain:{question, choices:[string,string,string], answer:0|1|2, why} }`
  - `setup` Stack: `{ racks:[[id,weight][], …×3], limits?:[[maxItems,maxWeight]×3] }`; Queue: `{ mode:'fifo'|'priority', patients:[id,name,priority][] }`
  - `ctx = { racks?:Stack[], clinic?:Clinic, events:{ popped:(string|null)[], called:(string|null)[], served:string[], cancelled:string[], registered:{id,priority}[] } }`
  - `export function complete(level, ctx):boolean`
  - `export function stars({done, moves, par, hintLevel, wrongPredictions}):0|1|2|3`
  - `export function buildRacks(setup):Stack[]`, `export function buildClinic(setup):Clinic`
- Produces (`app.js`): `progress`, `selectedLevel`, `loadLevel()`, `cancelPlan()`, `runPlan()`, `plan`, `planToken`.

- [ ] **Step 1: Tulis `tests/levels.test.js` yang gagal**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { transfer } from '../model.js';
import { levels, complete, stars, buildRacks, buildClinic } from '../levels.js';

const events=()=>({popped:[],called:[],served:[],cancelled:[],registered:[]});
const ids=s=>s.values().map(p=>p.id).join(',');

test('Each room has six levels with unique ids, par, hints, and an explain question',()=>{
  for(const room of ['stack','queue']){
    assert.equal(levels[room].length,6);
    assert.equal(new Set(levels[room].map(l=>l.id)).size,6);
    for(const l of levels[room])assert.ok(l.par>0&&l.hints.concept&&l.explain.choices.length===3&&l.explain.choices[l.explain.answer]);
  }
});

test('Stack level 4 (reverse) completes with the 7-move solution',()=>{
  const level=levels.stack[3],racks=buildRacks(level.setup),ctx={racks,events:events()};
  assert.equal(ids(racks[0]),'C,B,A');
  for(const [s,d] of [[0,1],[0,2],[0,2],[1,0],[2,1],[2,0],[1,0]])transfer(racks[s],racks[d]);
  assert.equal(ids(racks[0]),'A,B,C');
  assert.equal(complete(level,ctx),true);
});

test('Stack level 3 needs B popped and Rak A restored',()=>{
  const level=levels.stack[2],racks=buildRacks(level.setup),ctx={racks,events:events()};
  assert.equal(complete(level,ctx),false);
  transfer(racks[0],racks[2]);transfer(racks[0],racks[2]);ctx.events.popped.push(racks[0].pop().id);
  transfer(racks[2],racks[0]);transfer(racks[2],racks[0]);
  assert.equal(complete(level,ctx),true);
});

test('Stack level 5 capacity forces splitting blockers',()=>{
  const level=levels.stack[4],racks=buildRacks(level.setup);
  transfer(racks[0],racks[2]);
  assert.throws(()=>transfer(racks[0],racks[2]),/Kapasitas/);
  assert.equal(ids(racks[0]),'C,B,A','failed transfer leaves the source intact');
});

test('Queue level 5 (priority) checks P04 first, P02 before P03, and P01 cancelled',()=>{
  const level=levels.queue[4],clinic=buildClinic(level.setup),ctx={clinic,events:events()};
  clinic.register({id:'P04',name:'Dina',priority:'kritis'});ctx.events.registered.push({id:'P04',priority:'kritis'});
  ctx.events.called.push(clinic.call().id);ctx.events.served.push(clinic.advance(5).id);
  ctx.events.called.push(clinic.call().id);
  ctx.events.cancelled.push(clinic.cancel('P01').id);
  assert.deepEqual(ctx.events.called,['P04','P02']);
  assert.equal(complete(level,ctx),true);
});

test('Queue level 2 requires an underflow call after emptying',()=>{
  const level=levels.queue[1],clinic=buildClinic(level.setup),ctx={clinic,events:events()};
  for(let i=0;i<2;i++){ctx.events.called.push(clinic.call().id);ctx.events.served.push(clinic.advance(5).id);}
  assert.equal(complete(level,ctx),false);
  ctx.events.called.push(clinic.call()?.id??null);
  assert.equal(complete(level,ctx),true);
});

test('Stars reward par and penalise exact-step hints and wrong predictions',()=>{
  assert.equal(stars({done:false,moves:3,par:5,hintLevel:0,wrongPredictions:0}),0);
  assert.equal(stars({done:true,moves:9,par:5,hintLevel:0,wrongPredictions:0}),1);
  assert.equal(stars({done:true,moves:5,par:5,hintLevel:3,wrongPredictions:0}),2);
  assert.equal(stars({done:true,moves:5,par:5,hintLevel:2,wrongPredictions:1}),2);
  assert.equal(stars({done:true,moves:4,par:5,hintLevel:2,wrongPredictions:0}),3);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `node --test tests/levels.test.js`
Expected: FAIL `Cannot find module '…/levels.js'`.

- [ ] **Step 3: Tulis `levels.js`**

```js
import { Stack, Clinic } from './model.js';

const item = (id, weight = 1) => ({ id, name: `Barang ${id}`, weight, category: 'Elektronik' });
const ids = s => s.values().map(p => p.id).join(',');
const waiting = c => c.queues.flatMap(q => q.values()).map(p => p.id);

// setup.racks lists push order (bottom first); limits are [maxItems, maxWeight] per rack.
export function buildRacks(setup) {
  return setup.racks.map((list, i) => {
    const [maxItems, maxWeight] = setup.limits?.[i] ?? [6, 30];
    const s = new Stack(maxItems, maxWeight);
    list.forEach(([id, w]) => s.push(item(id, w)));
    return s;
  });
}
export function buildClinic(setup) {
  const c = new Clinic();
  for (const [id, name, priority] of setup.patients) c.register({ id, name, priority: setup.mode === 'fifo' ? 'non-darurat' : priority });
  return c;
}
export const complete = (level, ctx) => level.stages(ctx).every(([, done]) => done);
export function stars({ done, moves, par, hintLevel, wrongPredictions }) {
  if (!done) return 0;
  if (moves > par) return 1;
  return hintLevel >= 3 || wrongPredictions > 0 ? 2 : 3;
}

const ABCD = [['A', 4], ['B', 3], ['C', 5], ['D', 2]];
const restored = ctx => ids(ctx.racks[0]) === 'D,C,A' && ctx.racks[1].isEmpty() && ctx.racks[2].isEmpty();
const fifo = (...list) => list.map(([id, name]) => [id, name, 'non-darurat']);

export const levels = {
  stack: [
    { id: 's1', title: 'Tumpuk tiga', goal: 'Push A, B, lalu C ke Rak A. Siapa yang menjadi top?', par: 3,
      setup: { racks: [[], [], []] }, supply: ['A', 'B', 'C'],
      stages: ctx => [['A, B, C masuk', ctx.racks[0].count === 3], ['top → C → B → A', ids(ctx.racks[0]) === 'C,B,A']],
      hints: { concept: 'Barang baru selalu menjadi top; yang masuk terakhir berada paling atas.', direction: ctx => `Rak A berisi ${ctx.racks[0].count} dari 3 barang.` },
      explain: { question: 'Mengapa C menjadi top?', choices: ['C paling ringan', 'C masuk terakhir; push menaruh node baru di top', 'Top selalu barang dengan huruf terbesar'], answer: 1, why: 'push membuat node baru, menyambungkan next ke top lama, lalu memindahkan top ke node baru.' } },
    { id: 's2', title: 'Kosongkan rak', goal: 'Pop sampai Rak A kosong, lalu pop sekali lagi.', par: 4,
      setup: { racks: [[['A', 1], ['B', 1], ['C', 1]], [], []] },
      stages: ctx => [['Rak A kosong', ctx.racks[0].isEmpty()], ['pop() → None', ctx.events.popped.includes(null)]],
      hints: { concept: 'pop() pada Stack kosong tidak error: ia mengembalikan None (underflow).', direction: ctx => ctx.racks[0].isEmpty() ? 'Rak A sudah kosong. Coba pop sekali lagi.' : `Masih ada ${ctx.racks[0].count} barang.` },
      explain: { question: 'Apa yang dikembalikan pop() pada Stack kosong?', choices: ['0', 'None', 'Barang terakhir yang pernah ada'], answer: 1, why: 'Cabang top is None dijalankan dan return None tanpa mengubah referensi.' } },
    { id: 's3', title: 'Ambil barang B', goal: 'Keluarkan B, lalu pulihkan Rak A: top → D → C → A.', par: 5,
      setup: { racks: [ABCD, [], []] },
      stages: ctx => [['Pindahkan penghalang', ctx.racks[0].peek()?.id === 'B' || ctx.events.popped.includes('B')], ['Ambil B', ctx.events.popped.includes('B')], ['Pulihkan urutan', ctx.events.popped.includes('B') && restored(ctx)]],
      hints: { concept: 'Hanya barang top yang bisa diambil. Barang di atas target harus dipindah dulu, lalu dikembalikan dengan urutan terbalik.', direction: ctx => `Ada ${Math.max(0, ctx.racks[0].values().findIndex(p => p.id === 'B'))} barang di atas B pada Rak A.` },
      explain: { question: 'Mengapa C dikembalikan ke Rak A sebelum D?', choices: ['C lebih berat', 'D harus kembali menjadi top; yang dikembalikan terakhir berada di atas', 'Bantuan hanya menerima C'], answer: 1, why: 'Stack mempertahankan urutan LIFO: memulihkan urutan berarti membalik urutan pemindahan.' } },
    { id: 's4', title: 'Balik urutan', goal: 'Ubah Rak A dari top → C → B → A menjadi top → A → B → C.', par: 7,
      setup: { racks: [[['A', 1], ['B', 1], ['C', 1]], [], []] },
      stages: ctx => [['Rak A dikosongkan', ctx.racks[0].count < 3 || ids(ctx.racks[0]) === 'A,B,C'], ['top → A → B → C', ids(ctx.racks[0]) === 'A,B,C' && ctx.racks[1].isEmpty() && ctx.racks[2].isEmpty()]],
      hints: { concept: 'C harus masuk kembali ke Rak A paling awal, jadi Rak A harus dikosongkan dulu.', direction: ctx => `Rak A: ${ids(ctx.racks[0]) || 'kosong'}. Rak B: ${ids(ctx.racks[1]) || 'kosong'}. Bantuan: ${ids(ctx.racks[2]) || 'kosong'}.` },
      explain: { question: 'Mengapa dua rak lain diperlukan?', choices: ['Agar lebih cepat', 'Satu rak menahan C sementara barang lain dibalik di rak kedua', 'Karena kapasitas Rak A 3'], answer: 1, why: 'Satu pemindahan membalik urutan; dua rak memberi tempat untuk menyusun ulang tanpa menimbun C.' } },
    { id: 's5', title: 'Batas kapasitas', goal: 'Ambil B seperti level 3, tetapi Bantuan hanya muat 1 barang dan Rak B maksimal 6 kg.', par: 5,
      setup: { racks: [ABCD, [], []], limits: [[6, 30], [6, 6], [1, 30]] },
      stages: ctx => [['Ambil B', ctx.events.popped.includes('B')], ['Pulihkan urutan', ctx.events.popped.includes('B') && restored(ctx)]],
      hints: { concept: 'Transfer memeriksa kapasitas tujuan sebelum sumber diubah; jika gagal, sumber tetap utuh.', direction: () => 'D (2 kg) dan C (5 kg) tidak bisa sama-sama di Bantuan; bagi ke Rak B.' },
      explain: { question: 'Saat transfer ke rak penuh gagal, apa yang terjadi pada rak sumber?', choices: ['Barang top hilang', 'Tidak berubah, karena push tujuan dicoba sebelum pop sumber', 'Barang pindah ke rak lain otomatis'], answer: 1, why: 'Model memanggil peek, push tujuan (bisa gagal), baru pop sumber.' } },
    { id: 's6', title: 'Rencana dulu', goal: 'Susun rencana agar hanya C pindah ke Rak B dan Rak A menjadi top → D → B → A. Jalankan sekali.', par: 3, planMode: true,
      setup: { racks: [ABCD, [], []] },
      stages: ctx => [['Rak B berisi C', ids(ctx.racks[1]) === 'C'], ['top → D → B → A', ids(ctx.racks[0]) === 'D,B,A' && ctx.racks[2].isEmpty()]],
      hints: { concept: 'Di mode rencana, aksi dicatat dulu lalu dijalankan berurutan.', direction: () => 'D menghalangi C. Ke mana D bisa menunggu?' },
      explain: { question: 'Berapa operasi minimal dan mengapa?', choices: ['2: pindahkan C langsung', '3: D keluar sementara, C pindah, D kembali', '5: semua barang keluar'], answer: 1, why: 'Hanya D yang menghalangi C, jadi D cukup diparkir di Bantuan lalu dikembalikan.' } },
  ],
  queue: [
    { id: 'q1', title: 'Antre tiga', goal: 'Daftarkan P01, P02, P03. Siapa front dan siapa rear?', par: 3,
      setup: { mode: 'fifo', patients: [] }, supply: ['P01', 'P02', 'P03'],
      stages: ctx => [['Tiga pasien masuk', ctx.clinic.waiting() === 3], ['front P01 · rear P03', waiting(ctx.clinic).join(',') === 'P01,P02,P03']],
      hints: { concept: 'enqueue menyambung node baru di rear; front tetap pasien pertama.', direction: ctx => `${ctx.clinic.waiting()} dari 3 pasien terdaftar.` },
      explain: { question: 'Setelah P03 masuk, apa yang berubah?', choices: ['front pindah ke P03', 'rear.next lama menunjuk P03, lalu rear pindah ke P03', 'Semua node digeser'], answer: 1, why: 'Hanya dua referensi yang berubah: next milik rear lama dan rear itu sendiri.' } },
    { id: 'q2', title: 'Kosongkan antrean', goal: 'Layani semua pasien, lalu panggil sekali lagi.', par: 5,
      setup: { mode: 'fifo', patients: fifo(['P01', 'Arif'], ['P02', 'Bima']) },
      stages: ctx => [['Semua dilayani', ctx.events.served.length >= 2 && ctx.clinic.waiting() === 0], ['dequeue() → None', ctx.events.called.includes(null)]],
      hints: { concept: 'Ketika node terakhir keluar, front dan rear sama-sama menjadi None.', direction: ctx => ctx.clinic.waiting() ? `Masih ${ctx.clinic.waiting()} pasien menunggu.` : 'Antrean kosong. Panggil sekali lagi.' },
      explain: { question: 'Mengapa rear juga diubah menjadi None saat pasien terakhir keluar?', choices: ['Agar rear tidak menunjuk node lama yang sudah keluar', 'Agar front ikut berubah', 'Tidak perlu diubah'], answer: 0, why: 'Tanpa itu, enqueue berikutnya menyambung ke node yang sudah tidak ada di antrean.' } },
    { id: 'q3', title: 'Batal di tengah', goal: 'Batalkan P03 tanpa mengubah urutan pasien lain.', par: 1,
      setup: { mode: 'fifo', patients: fifo(['P01', 'Arif'], ['P02', 'Bima'], ['P03', 'Citra'], ['P04', 'Dina']) },
      stages: ctx => [['P03 dibatalkan', ctx.events.cancelled.includes('P03')], ['Urutan P01 → P02 → P04', waiting(ctx.clinic).join(',') === 'P01,P02,P04']],
      hints: { concept: 'Membatalkan node tengah berarti menyambung next milik node sebelumnya ke node sesudahnya.', direction: () => 'Pilih P03 di daftar pasien.' },
      explain: { question: 'Referensi mana yang berubah saat P03 dibatalkan?', choices: ['front', 'P02.next berubah dari P03 ke P04', 'rear'], answer: 1, why: 'P03 bukan front maupun rear, jadi hanya next milik P02 yang disambung ulang.' } },
    { id: 'q4', title: 'Jam loket', goal: 'Layani tiga pasien sampai selesai. Satu pasien = 5 menit.', par: 6,
      setup: { mode: 'fifo', patients: fifo(['P01', 'Arif'], ['P02', 'Bima'], ['P03', 'Citra']) },
      stages: ctx => [['P01 selesai', ctx.events.served.includes('P01')], ['Tiga pasien selesai', ctx.events.served.length >= 3]],
      hints: { concept: 'Loket hanya melayani satu pasien; panggil berikutnya setelah pelayanan selesai.', direction: ctx => `${ctx.events.served.length} dari 3 selesai.` },
      explain: { question: 'Mengapa estimasi tunggu P03 di awal adalah 10 menit?', choices: ['Ada dua pasien di depannya, masing-masing 5 menit', 'P03 non-darurat', 'Jam mulai 08.10'], answer: 0, why: 'Estimasi menjumlahkan durasi pasien di depan pada antrean saat ini.' } },
    { id: 'q5', title: 'Prioritas tetap tertib', goal: 'Daftarkan P04 kritis, layani sampai selesai, panggil P02 sebelum P03, lalu batalkan P01.', par: 5,
      setup: { mode: 'priority', patients: [['P01', 'Arif', 'non-darurat'], ['P02', 'Bima', 'darurat'], ['P03', 'Citra', 'darurat']] },
      stages: ctx => {
        const c = ctx.events.called, i4 = c.indexOf('P04'), i2 = c.indexOf('P02'), i3 = c.indexOf('P03');
        return [['Daftarkan P04 kritis', ctx.events.registered.some(p => p.id === 'P04' && p.priority === 'kritis')], ['Selesaikan P04', ctx.events.served.includes('P04')],
          ['Panggil P02', i4 >= 0 && i2 > i4 && (i3 < 0 || i3 > i2)], ['Batalkan P01', ctx.events.cancelled.includes('P01')]];
      },
      hints: { concept: 'Pemanggilan selalu mengambil front dari jalur prioritas tertinggi yang berisi. Di dalam satu jalur berlaku FIFO.', direction: ctx => ctx.events.registered.some(p => p.id === 'P04') ? 'P02 dan P03 sama-sama darurat; siapa yang datang lebih dulu?' : 'Belum ada pasien kritis di antrean.' },
      explain: { question: 'Mengapa P02 dipanggil sebelum P03?', choices: ['Nama P02 lebih awal', 'Keduanya darurat dan P02 masuk lebih dulu (FIFO dalam jalur)', 'P03 dibatalkan'], answer: 1, why: 'Prioritas memilih jalur; di dalam jalur, dequeue mengambil front.' } },
    { id: 'q6', title: 'Rencana pelayanan', goal: 'Susun rencana yang melayani P02 lalu P01 sampai selesai. Jalankan sekali.', par: 4, planMode: true,
      setup: { mode: 'priority', patients: [['P01', 'Arif', 'non-darurat'], ['P02', 'Bima', 'darurat']] },
      stages: ctx => [['P02 selesai lebih dulu', ctx.events.served[0] === 'P02'], ['P01 selesai', ctx.events.served[1] === 'P01']],
      hints: { concept: 'Panggil lalu Selesaikan adalah satu siklus pelayanan.', direction: () => 'Dua pasien = dua siklus.' },
      explain: { question: 'Mengapa P02 dilayani lebih dulu walau datang setelah P01?', choices: ['P02 darurat; jalur darurat diperiksa sebelum non-darurat', 'Acak', 'P01 dibatalkan'], answer: 0, why: 'call() mencari Queue pertama yang berisi menurut urutan prioritas.' } },
  ],
};
```

- [ ] **Step 4: Jalankan tes level**

Run: `node --test tests/levels.test.js`
Expected: PASS 7 tes. Jika `Stack level 5` tidak melempar, pastikan `limits[2]` = `[1, 30]`.

- [ ] **Step 5: Rute server dan sink**

`serve.js` — tambahkan ke `files`:

```js
  ['/levels.js', ['levels.js','text/javascript; charset=utf-8']],
```

`tests/execution-view.test.js` — tambahkan import dan isi konteks:

```js
import { levels, complete, stars, buildRacks, buildClinic } from '../levels.js';
```

```js
  const context = vm.createContext({ document, Stack, Queue, Clinic, transfer, priorities, lessons, warmupQuestions, levels, complete, stars, buildRacks, buildClinic,
```

- [ ] **Step 6: Tulis tes wiring yang gagal**

```js
test('Levels load from data, count moves, award stars, and ask an explain question',()=>{
  const {context,element,click,action}=view();
  action({level:'0'});click('start-mission');
  for(let i=0;i<3;i++)action({quickPush:'true'});
  assert.equal(vm.runInContext('racks[0].values().map(p=>p.id).join()',context),'C,B,A');
  assert.equal(vm.runInContext('progress.stack[0].stars',context),3);
  assert.match(element('level-summary').innerHTML,/Mengapa C menjadi top\?/);
  action({explain:'1'});
  assert.match(element('level-summary').innerHTML,/push membuat node baru/);
});

test('Loading a level over an edited experiment asks first',()=>{
  const {context,element,click,action,decide}=view();
  action({action:'pop'});
  action({level:'3'});click('start-mission');
  assert.equal(element('replace-confirm').open,true);
  decide('cancel');
  assert.equal(vm.runInContext('racks[0].peek().id',context),'C');
});

test('Plan mode queues actions, runs them in order, and stops when the room changes',()=>{
  const {context,element,action,click}=view();
  vm.runInContext('globalThis.__timers=[];setTimeout=(f)=>{__timers.push(f);return __timers.length;}',context);
  action({level:'5'});click('start-mission');
  action({rack:'0'});element('destination').value='2';action({action:'transfer'});
  assert.equal(vm.runInContext('plan.length',context),1,'transfer is recorded, not executed');
  assert.equal(vm.runInContext('racks[0].peek().id',context),'D');
  action({runPlan:'true'});
  action({room:'queue'});
  vm.runInContext('__timers.splice(0).forEach(f=>f())',context);
  assert.equal(vm.runInContext('racks[0].peek().id',context),'D','switching room cancels the pending plan');
});
```

- [ ] **Step 7: Jalankan, pastikan gagal**

Run: `npm test`
Expected: FAIL (`progress is not defined`, `plan is not defined`).

- [ ] **Step 8: Integrasi di `app.js`**

Import (`app.js:3`, setelah import `challenges.js`):

```js
import { levels, complete, stars, buildRacks, buildClinic } from './levels.js';
```

State baru (setelah `let missions = …`):

```js
const progress = { stack: levels.stack.map(() => ({ done: false, stars: 0 })), queue: levels.queue.map(() => ({ done: false, stars: 0 })) };
const selectedLevel = { stack: 0, queue: 0 };
let plan = [], planToken = 0, planTimer = null, pendingLabel = null;
const newEvents = () => ({ popped: [], called: [], served: [], cancelled: [], registered: [] });
const countedMove = op => /^(pop|dequeue|pindah|waktu|batalkan|push\(|enqueue\()/.test(op);
```

`notify()` — setelah baris `if (operation && …) edited[room] = true;`:

```js
  if (operation && countedMove(operation) && missions[room].active) missions[room].moves = (missions[room].moves ?? 0) + 1;
```

**Event.** Tambahkan pada handler yang ada:
- `pop`: setelah `lastResult=…`: `if(missions.stack.active)missions.stack.events.popped.push(data?.id??null);`
- `call`: setelah `lastResult=…`: `if(missions.queue.active)missions.queue.events.called.push(p?.id??null);`
- `advance`/`next-event`: setelah `const done=clinic.advance(minutes);`: `if(done&&missions.queue.active)missions.queue.events.served.push(done.id);`
- `cancel`: setelah `lastResult=…`: `if(missions.queue.active)missions.queue.events.cancelled.push(p.id);`
- `registerPatient()`: ganti baris `if(missions.queue.active&&p.id==='P04'&&priority==='kritis')missions.queue.critical=true;` dengan `if(missions.queue.active)missions.queue.events.registered.push({id:p.id,priority});`

Hapus logika flag misi lama: `if(data?.id==='B'&&missions.stack.active)missions.stack.removed=true;`, `if(missions.stack.active&&racks[0].peek()?.id==='B')missions.stack.cleared=true;` (di `performTransfer`), `if(missions.queue.active&&p?.id==='P02'…)missions.queue.fifo=true;`, `if(done?.id==='P04'…)missions.queue.servedCritical=true;`, `if(missions.queue.active&&p.id==='P01')missions.queue.cancelled=true;`.

**`missionHint()` (Task 9) berbasis event.** Ganti:
- `!m.removed` (dua kemunculan) dengan `!m.events.popped.includes('B')`
- baris pertama cabang Queue dengan:

```js
  const [critical,servedCritical,fifoDone]=levels.queue[4].stages({clinic,events:m.events}).map(([,d])=>d);
```

dan di `step`/`direction`, ganti `m.critical`, `m.servedCritical`, `m.fifo` dengan `critical`, `servedCritical`, `fifoDone`.

**Mode rencana dan pemuatan level.** Tambahkan setelah `function run(operation){…}`:

```js
function cancelPlan(){planToken++;clearTimeout(planTimer);planTimer=null;plan=[];}
function runPlan(){
  const steps=plan.splice(0),token=++planToken;let i=0;
  const tick=()=>{
    if(token!==planToken)return;
    if(i>=steps.length){planTimer=null;render();return;}
    try{steps[i++].run();render();}catch(error){planTimer=null;notify(`Rencana berhenti di langkah ${i}: ${error.message}`,true);render();return;}
    planTimer=setTimeout(tick,700/motionSpeed);
  };
  planTimer=setTimeout(tick,0);
}
function loadLevel() {
  const level=levels[room][selectedLevel[room]];
  endDrag();stopTrace();trace=null;drafts[room]={};clearTimeout(achievementTimer);$('achievement').hidden=true;cancelPlan();lastResult=null;
  missions[room]={active:true,level,index:selectedLevel[room],events:newEvents(),moves:0,hintLevel:0,wrongPredictions:0,explained:null,
    supply:level.supply?.map(id=>room==='stack'?item(id,`Barang ${id}`,1):id)};
  if(room==='stack'){racks=buildRacks(level.setup);rack=0;selectedItem=null;capacityDrafts=[{},{},{}];}
  else{queueMode=level.setup.mode;clinic=buildClinic(level.setup);selectedQueue=queueMode==='fifo'?2:1;selectedPatient=null;patientSerial=level.setup.patients.length+1;}
  notify(`Level ${selectedLevel[room]+1}: ${level.goal}`,false,'misi()');edited[room]=false;render();
}
```

Di awal `run(operation)`, sebelum `try`:

```js
  if(missions[room].active&&missions[room].level?.planMode&&!planTimer){plan.push({label:pendingLabel??'aksi',run:operation});pendingLabel=null;renderMission();return;}
```

Di handler klik aksi (bagian `const action=button.dataset.action;`), sebelum `run(()=>{…})`:

```js
  const source=rack,destination=Number($('destination').value);
  pendingLabel=action==='transfer'?`pindah ${rackNames[source]} → ${rackNames[destination]}`:action==='call'?'panggil':action==='next-event'?'selesaikan':action;
```

dan di dalam closure ganti `performTransfer(rack,Number($('destination').value));` dengan `performTransfer(source,destination);` (agar langkah rencana memakai rak saat dicatat).

Untuk aksi satu tap (Task 8), set label sebelum `run`: `pendingLabel=tap.dataset.quickPush?'push':'daftar';`.

Ganti listener `#start-mission`:

```js
$('start-mission').addEventListener('click',()=>replaceExperiment('Memuat level akan mengganti isi ruang ini dengan skenario level. Eksperimen saat ini akan hilang.',loadLevel));
```

Panggil `cancelPlan();` di: handler ganti ruang (`button.dataset.room`), handler `#reset`, dan listener `visibilitychange` saat `document.hidden`.

**`renderMission()` berbasis level.** Ganti seluruh fungsi:

```js
const missionHintFor=(level,ctx)=>['s3','q5'].includes(level.id)?missionHint().step:level.hints.direction(ctx);
function renderMission() {
  const m=missions[room],level=m.level??levels[room][selectedLevel[room]];
  const ctx=m.active?(room==='stack'?{racks,events:m.events}:{clinic,events:m.events}):(room==='stack'?{racks:buildRacks(level.setup),events:newEvents()}:{clinic:buildClinic(level.setup),events:newEvents()});
  const stages=level.stages(ctx).map(([n,d])=>[n,m.active&&d]);
  const done=m.active&&stages.every(([,d])=>d);
  $('mission-title').textContent=`Level ${(m.index??selectedLevel[room])+1}: ${level.title}`;
  $('mission-description').textContent=level.goal;
  $('mission-status').textContent=done?'Selesai ✓':m.active?`Langkah ${m.moves??0} · par ${level.par}`:'Siap dicoba';
  $('mission-status').classList.toggle('complete',done);
  $('start-mission').textContent=m.active?'Ulangi level':'Mulai level';
  const next=stages.findIndex(([,d])=>!d);
  $('mission-progress').innerHTML=stages.map(([name,d],i)=>`<span class="${d?'done':m.active&&i===next?'current':''}">${d?icon('check'):`${i+1}.`} ${escape(name)}</span>`).join('');
  $('level-select').innerHTML=levels[room].map((l,i)=>`<button class="level-chip ${i===selectedLevel[room]?'active':''}" data-level="${i}" aria-pressed="${i===selectedLevel[room]}" aria-label="Level ${i+1}: ${escape(l.title)}, ${progress[room][i].stars} bintang">${i+1}<span>${'★'.repeat(progress[room][i].stars)}${'☆'.repeat(3-progress[room][i].stars)}</span></button>`).join('');
  let hint='';
  if(m.active&&!done){
    const h=['s3','q5'].includes(level.id)?missionHint():{};
    const tier=m.hintLevel??0;
    hint=h.recovery?h.step:tier>=3?`Langkah berikut: ${missionHintFor(level,ctx)}`:tier===2?level.hints.direction(ctx):tier===1?level.hints.concept:'';
  }
  $('mission-next').textContent=hint;
  $('mission-hint').hidden=!m.active||done||(m.hintLevel??0)>=3;
  $('mission-hint').textContent=`Petunjuk (${(m.hintLevel??0)+1}/3)`;
  $('mission-predict').innerHTML=predictionHTML();
  const planning=m.active&&level.planMode&&!done;
  $('plan-panel').hidden=!planning;
  $('plan-panel').innerHTML=planning?`<ol>${plan.map(p=>`<li>${escape(p.label)}</li>`).join('')||'<li>Rencana kosong. Pilih aksi di dock.</li>'}</ol><button class="primary" data-run-plan="true" ${plan.length?'':'disabled'}>Jalankan rencana</button> <button class="text-button" data-clear-plan="true">Hapus</button>`:'';
  if(done&&!m.wasComplete){
    m.earned=stars({done,moves:m.moves??0,par:level.par,hintLevel:m.hintLevel??0,wrongPredictions:m.wrongPredictions??0});
    progress[room][m.index]={done:true,stars:Math.max(m.earned,progress[room][m.index].stars)};
    completedMissions.add(`${room}:${m.index}`);
  }
  $('level-summary').hidden=!done;
  if(done){
    const e=level.explain,answered=m.explained!=null,right=m.explained===e.answer;
    $('level-summary').innerHTML=`<strong>${'★'.repeat(m.earned)}${'☆'.repeat(3-m.earned)} · ${m.moves} langkah (par ${level.par})</strong><p>${escape(e.question)}</p><div class="operation-row">${e.choices.map((c,i)=>`<button class="secondary ${m.explained===i?(i===e.answer?'correct':'incorrect'):''}" data-explain="${i}">${escape(c)}</button>`).join('')}</div>${right?`<p class="explain-why">${escape(e.why)}</p>`:answered?'<p class="explain-why">Belum tepat. Lihat lagi rekaman di Lensa, lalu coba lagi.</p>':''}${m.index<5?`<button class="primary" data-level="${m.index+1}" data-autostart="true">Level berikutnya</button>`:''}`;
  }
  m.wasComplete=done;
  $('mission-score').textContent=`★ ${Object.values(progress).flat().reduce((n,p)=>n+p.stars,0)} / 36`;
}
```

Hapus logika banner `achievement` lama di `renderMission` (ringkasan level menggantikannya). Biarkan elemen `#achievement` dan timer A5 untuk dipakai ulang bila diperlukan.

**Cabang klik.** Tambahkan ke selector `button`: `[data-level],[data-explain],[data-run-plan],[data-clear-plan]`. Tambahkan cabang setelah cabang `data-hint`:

```js
  if(button.dataset.level!==undefined){cancelPlan();selectedLevel[room]=Number(button.dataset.level);if(button.dataset.autostart){edited[room]=false;loadLevel();}else renderMission();return;}
  if(button.dataset.explain!==undefined){missions[room].explained=Number(button.dataset.explain);renderMission();return;}
  if(button.dataset.runPlan){runPlan();return;}
  if(button.dataset.clearPlan){plan=[];renderMission();return;}
```

Urutan cabang penting di sink: `action({quickPush:'true'})` harus ditangani oleh cabang `tap` (Task 8) sebelum cabang-cabang ini; cabang lain hanya bereaksi bila properti `dataset`-nya ada.

`index.html` — di `.mission-copy`, setelah `#mission-progress`:

```html
<div id="level-select" class="level-select" role="group" aria-label="Pilih level"></div>
<div id="plan-panel" class="plan-panel" hidden></div>
```

dan di `.scene-wrap`, setelah `#achievement`:

```html
<section id="level-summary" class="level-summary" aria-live="polite" hidden></section>
```

Akhir `styles.css`:

```css
/* ── v2 · level ─────────────────────────────────────── */
.level-select{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.level-chip{min-width:44px;min-height:44px;border:1px solid var(--line);background:#fff;border-radius:var(--r-control);display:grid;place-items:center;font-size:var(--t-label);line-height:1.1;padding:4px 8px}
.level-chip span{font-size:var(--t-meta);color:var(--goal)}
.level-chip.active{border-color:var(--action);background:var(--pale);color:var(--action)}
.plan-panel{margin-top:8px;padding:8px 12px;border:1px dashed var(--line-strong);border-radius:var(--r-hud)}
.plan-panel ol{margin:0 0 8px;padding-left:20px;font-family:Consolas,monospace;font-size:var(--t-code)}
.level-summary{position:absolute;right:16px;bottom:84px;max-width:360px;padding:16px;background:#fff;border:1px solid var(--line-strong);border-radius:var(--r-card);box-shadow:var(--shadow-2);font-size:var(--t-body)}
.level-summary>strong{display:block;color:var(--goal-ink);font-size:var(--t-title);margin-bottom:8px}
.level-summary .operation-row{display:grid;grid-template-columns:1fr;gap:6px;margin:8px 0}
.level-summary .correct{border-color:var(--select-line);color:var(--teal-ink)}
.level-summary .incorrect{border-color:var(--danger);color:var(--danger)}
.explain-why{color:var(--ink);margin:6px 0 10px}
@media(max-width:540px){.level-summary{left:8px;right:8px;bottom:64px;max-width:none}}
```

- [ ] **Step 9: Perbarui tes lama misi**

Level default kini level 1. Tes yang memulai misi "Ambil B" atau misi prioritas harus memilih level dulu:
- `tests/execution-view.test.js`: sisipkan `action({level:'2'});` tepat sebelum setiap `click('start-mission')` di ruang Stack, dan `action({level:'4'});` sebelum `click('start-mission')` di ruang Queue (termasuk tes `Order text…` dari Task 1 dan tes hint Task 9). Ganti `vm.runInContext('completedMissions.has("stack")',context)` dengan `vm.runInContext('progress.stack[2].done',context)`.
- `tests/browser.cjs` dan `tests/browser-audit.cjs`: sebelum setiap `page.locator('#start-mission').click()`, klik `page.locator('[data-level="2"]')` (Stack) atau `page.locator('[data-level="4"]')` (Queue).
- Asersi teks `#mission-description` dari Task 1 (`/top → D → C → A/`) tetap lulus karena `goal` level s3 memuat teks itu.

- [ ] **Step 10: Jalankan tes**

Run: `npm test`
Expected: PASS semua (Node).

- [ ] **Step 11: Feel-check**

Mainkan level 1–6 di kedua ruang:
- Chip level menampilkan bintang setelah selesai.
- Ringkasan muncul setelah stage terakhir; jawaban benar menampilkan alasan; "Level berikutnya" memuat level tanpa dialog.
- Level 6 Stack: aksi dock masuk ke daftar rencana; "Jalankan rencana" mengeksekusi dengan jeda 700ms; pindah ke Queue di tengah eksekusi menghentikan rencana.
- Level 5 Stack: transfer kedua ke Bantuan ditolak dengan pesan kapasitas, Rak A tidak berubah.

- [ ] **Step 12: Commit**

```bash
git add levels.js serve.js app.js index.html styles.css tests/levels.test.js tests/execution-view.test.js tests/browser.cjs tests/browser-audit.cjs
git commit -m "feat: six levels per room with stars, plan mode, and explain questions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Kejelasan edukasi lanjutan (E4, E5)

**Files:**
- Modify: `app.js` (`performTransfer`)
- Modify: `index.html` (`.execution-contract`)
- Test: `tests/execution-view.test.js`

- [ ] **Step 1: Tulis tes yang gagal**

```js
test('Transfer explains peek, push, then pop and why the source changes last',()=>{
  const {element,action}=view();
  action({action:'transfer'});
  assert.match(element('feedback').innerHTML,/peek sumber → push tujuan → pop sumber/);
  assert.match(element('memory-context').textContent,/peek Rak A → D/);
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npm test`
Expected: FAIL pada pola feedback.

- [ ] **Step 3: Implementasi**

Di `performTransfer`, ganti panggilan `traceExecution(…)` dan `notify(…)`:

```js
  traceExecution([{execution:racks[destination].lastExecution,context:`Pindah · peek ${rackNames[source]} → ${data.id}, lalu 1/2 push tujuan ${rackNames[destination]}`},{execution:racks[source].lastExecution,context:`Pindah · 2/2 pop sumber ${rackNames[source]}`}]);
```

```js
  notify(`${data.id}: ${rackNames[source]} → ${rackNames[destination]}. Urutan: peek sumber → push tujuan → pop sumber. Sumber diubah terakhir agar tetap utuh bila tujuan penuh.`,false,'pindah()');
```

`index.html` — ganti `<p class="execution-contract">…</p>` dengan:

```html
<details class="execution-contract"><summary>Cuplikan Python dari dokumen praktikum; arena menjalankan model JavaScript yang setara.</summary><p>Python di sini bukan interpreter. Rekaman node diambil saat model JavaScript berjalan. Menelusuri rekaman tidak mengubah arena.</p></details>
```

- [ ] **Step 4: Jalankan tes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app.js index.html tests/execution-view.test.js
git commit -m "docs: explain transfer order and condense the execution disclaimer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Pembersihan CSS, dokumentasi, dan verifikasi akhir

**Files:**
- Modify: `styles.css` (hapus aturan mati)
- Modify: `DESIGN.md`, `.impeccable/design.json`, `README.md`, `PRODUCT.md`, `PANDUAN-PENGGUNA.md`, `AUDIT-GAMEPLAY.md`
- Update: `screenshots/audit/*`

- [ ] **Step 1: Hapus aturan mati**

Cari kelas CSS yang tidak lagi muncul di HTML/JS:

```bash
node -e "
const fs=require('fs');const css=fs.readFileSync('styles.css','utf8'),src=fs.readFileSync('index.html','utf8')+fs.readFileSync('app.js','utf8');
const classes=new Set([...css.matchAll(/\.([a-z][a-z0-9-]+)/g)].map(m=>m[1]));
console.log([...classes].filter(c=>!src.includes(c)).join('\n'));"
```

Hapus aturan yang selectornya hanya memuat kelas dalam daftar itu (contoh yang diharapkan: `scene-toolbar`, `view-label`, `live-dot`, `toolbar-divider`, `inspector-icon`, `execution-grid`, `mission-symbol`). Jangan hapus kelas yang dibuat dinamis: `selected`, `active`, `done`, `current`, `error`, `fresh`, `changed`, `trace-focus`, `drop-zone`, `is-dragging`, `keyboard-input`, `reduced-motion`, `correct`, `incorrect`, `complete`, `skipped`, `memory-changed`, `memory-detached`, `reference-changed`.

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Dokumentasi**

- `DESIGN.md`: frontmatter `colors` (tambah `goal`, `goal-ink`, `goal-pale`, `structure-line`, `select-line`), `typography` (skala tujuh langkah), `rounded` (`control 6px`, `hud 10px`, `card 16px`); bagian **Layout** (topbar 56px, stage + dock, Lensa, rail hanya ponsel), **Colors** (peran baru, triase), **Typography** (minimum 12px termasuk SVG), **Reduced motion** (sorot statis), **Linked-list and Python trace** (sorot `trace-focus`, putar otomatis). Salin nilai yang sama ke `.impeccable/design.json`.
- `README.md`: "Isi simulasi" — 6 level per ruang, bintang, mode rencana, Baki hasil, Lensa, push/daftar satu tap, Queue mulai di FIFO; "Batas versi ini" — progres level di memori tab.
- `PRODUCT.md`: Capabilities — level dan bintang; Queue dibuka di FIFO dasar.
- `PANDUAN-PENGGUNA.md`: alur baru (pilih level, dock aksi, petunjuk 3 tingkat, Baki hasil, Lensa, pertanyaan setelah level).
- `AUDIT-GAMEPLAY.md`: tambahkan bagian "Status implementasi" yang memetakan setiap temuan (§3, §10–13, A1–A8, E1–E8) ke task dan commit.

- [ ] **Step 3: Verifikasi lengkap**

```bash
npm test
```

```bash
python tests/practicum-parity.py
```

```bash
node tests/browser-audit.cjs
```

Untuk `tests/browser.cjs`, jalankan `node serve.js` di satu terminal, lalu di terminal lain:

```bash
node tests/browser.cjs
```

Expected: semua lulus. `practicum-parity.py` membutuhkan kedua DOCX di folder induk; jika Python, DOCX, atau Playwright tidak tersedia, catat "tidak dijalankan" beserta alasannya di ringkasan PR.

- [ ] **Step 4: Feel-check manual**

Di Browser pane pada 1440×900, 1024×720, 390×844, 320×640:

1. Push satu tap: kotak datang dari Penerimaan, rekaman diputar otomatis, kotak bertepi biru mengikuti baris aktif.
2. Pop: kotak melengkung ke Baki hasil; `None` tampil bergaris putus pada rak kosong.
3. Drag ke lantai kosong: bayangan pulang.
4. Gerakan minimal: tidak ada translasi; objek yang berubah bertepi amber.
5. Tab + Enter pada kotak: animasi tetap berjalan.
6. Queue prioritas: P04 merah dengan tanda +; peek berlabel jalur; "Berikutnya dilayani" benar.
7. Level 1–6 kedua ruang dapat diselesaikan dan memberi bintang.
8. Tidak ada gulir horizontal; teks terkecil ≥12px.

- [ ] **Step 5: Screenshot dan commit**

`node tests/browser-audit.cjs` memperbarui `screenshots/audit/*`. Lalu:

```bash
git add -A
git commit -m "docs: update design system, guides, and audit status for the UI/UX overhaul

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Lampiran · Peta temuan → task

| Temuan (AUDIT-GAMEPLAY.md) | Task |
|---|---|
| §3 Loop terpecah (P1) | 4, 7 |
| §3 Petunjuk persis (P1) | 9 |
| §3 Prediksi tersembunyi (P1) | 9 |
| §3 Satu misi, tanpa jenjang (P1) | 10 |
| §3 Tantangan pemula terpisah (P2) | 4 (dipindah di bawah arena), 10 (level 1–2 di arena) |
| §3 Push 4 isian (P2) | 8 |
| §3 Return tanpa wujud (P2) | 6 |
| §3 Queue default prioritas (P2) | 8 |
| §3 Kontrol waktu (P2) | 8 |
| §3 Gerak tidak sinkron (P3) | 7 |
| §3 Label SVG kecil (P3) | 5 |
| §10 Layout (arena di bawah lipatan, rail ganda, topbar, panel form, hierarki, breakpoint) | 4, 12 |
| §11 Style (kesan dashboard, drift token, wordmark) | 2, 4, 12 |
| §12 Tipografi (bold palsu, 12 ukuran, ID diputar) | 1, 2, 5 |
| §13 Palet (prioritas biru, kotak acak, turquoise 5 arti, tanpa hangat, kontras outline) | 2, 3 |
| §16 A1 translate tanpa satuan | 1 |
| §16 A2 keyboard tanpa gerak | 1 |
| §16 A3 reduced motion tanpa isyarat | 6 |
| §16 A4 gerak ↔ rekaman | 7 |
| §16 A5 banner keluar | 6 |
| §16 A6 drag pulang | 6 |
| §16 A7 momen selesai | 10 |
| §16 A8 crossfade feedback | 6 |
| §17 E1 peek Queue | 8 |
| §17 E2 arah baca | 1 |
| §17 E3 catatan kompleksitas | 1 |
| §17 E4 transfer | 11 |
| §17 E5 penafian | 11 |
| §17 E6 explain | 10 |
| §17 E7 isEmpty Queue | 8 |
| §17 E8 pertahankan istilah ganda dan feedback | Global Constraints |
