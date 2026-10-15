# Audit gameplay dan rancangan layout · Strukdat Gaming

15 Oktober 2026 · Fase 1 dari audit UI/UX menyeluruh (gameplay dahulu; style, tipografi, warna, animasi detail menyusul).

Sumber bukti: pembacaan `app.js`, `model.js`, `challenges.js`, `execution.js`; screenshot `screenshots/audit/*` (dibuat setelah commit terakhir); pengukuran DOM langsung di Chromium 1440×900. Belum ada uji dengan mahasiswa.

## 1. Ringkasan

Model data, kejujuran edukasi (rekaman node asli, label Python ≠ interpreter), dan aksesibilitas sudah kuat. Masalah utamanya ada pada **loop permainan**: aksi, hasil, dan penjelasan berada di empat wilayah layar yang terpisah, tantangan tidak bertingkat, dan petunjuk misi selalu memberi langkah persis sehingga pemain tidak perlu berpikir. Aplikasi saat ini terasa seperti *dashboard simulasi*, belum seperti *game belajar*.

## 2. Pengukuran langsung (1440×900)

| Elemen | Posisi Y | Terlihat tanpa gulir? |
|---|---|---|
| Arena SVG | 583 (tinggi 540) | Hanya 317px atas |
| Tombol push (panel kanan) | 902 | Tidak |
| Aksi cepat di bawah arena | 1287 | Tidak |
| Feedback operasi | 1348 | Tidak |
| Diagram linked-list | 1480 | Tidak |
| Bedah Eksekusi (kode) | 1661 | Tidak |

Satu siklus *aksi → amati → pahami* membentang ±1.100px vertikal. Label ID kotak tampil 10,4px dan metadata rak 9,5px (skala SVG 0,95).

## 3. Temuan gameplay

| P | Temuan | Bukti | Dampak belajar |
|---|---|---|---|
| P1 | Loop aksi–hasil–kode terpecah ke 4 wilayah; arena, linked-list, dan kode tidak pernah terlihat bersamaan. | Tabel §2; urutan section `index.html` | Prinsip produk "hubungkan tindakan fisik dengan perubahan referensi" tidak terjadi secara visual. Pemain melihat kotak bergerak, lalu harus menggulir untuk melihat *mengapa*. |
| P1 | Petunjuk misi selalu tampil sebagai langkah persis ("Langkah berikut: Pindahkan D dari Rak A ke Bantuan"). | `renderMission`, `app.js:297-315` | Misi menjadi mengikuti instruksi; keterlibatan turun dari *changing* ke *viewing* (Naps dkk. 2002). |
| P1 | Prediksi hanya muncul saat misi aktif, di dasar panel kanan (di bawah lipatan), dan tidak menahan animasi. | `predictionState`, `app.js:254-264` | Pola *predict–observe–explain* ada, tetapi hampir tidak ditemui pemain. |
| P1 | Hanya 1 misi per ruang (skor "0/2 misi"); tidak ada jenjang kesulitan, bintang, atau tantangan lanjutan setelah selesai. | `renderMission`; banner hilang setelah 3,5 dtk | Tidak ada alasan bermain ulang atau naik level. HRM dan Brilliant memakai urutan level pendek bertingkat. |
| P2 | Tantangan pemula terpisah dari arena: kuis pilihan ganda dengan diagram daftar sendiri, ditaruh di atas arena dan tertutup secara default. | `renderWarmup`; `.warmup` di `index.html` | Pemain menjawab tentang struktur abstrak, lalu pindah konteks ke arena. Jawaban tidak dilakukan dengan *mengoperasikan* struktur. |
| P2 | Push memerlukan formulir 4 isian (ID, berat, nama, kategori). Kategori tidak memengaruhi apa pun. | `renderStackControls` | Operasi paling dasar adalah yang paling lambat. Gesekan tinggi untuk eksperimen cepat. |
| P2 | Nilai kembali (return) pop/dequeue/peek/isEmpty hanya muncul sebagai teks feedback. Kotak yang di-pop memudar ke atas lalu hilang. | `animateScene`, `app.js:378-381` | Konsep "pop mengembalikan data" dan "None saat kosong" tidak punya wujud fisik. |
| P2 | Queue dibuka dalam mode **Tiga prioritas**; FIFO dasar (inti Praktikum 7) tersembunyi di toggle. | `queueMode = 'priority'`, `app.js:11` | Urutan belajar terbalik: pemain bertemu kompleksitas prioritas sebelum FIFO murni. |
| P2 | Waktu Queue dikendalikan dua tombol (`+1 menit`, `Kejadian berikut`) yang bercampur dengan operasi struktur data. | `renderQueueControls` | Mekanik jam bersaing dengan dequeue/enqueue untuk perhatian. |
| P3 | Animasi kode tidak sinkron dengan animasi objek: kotak bergerak 560 ms, rekaman baris diputar terpisah di bagian bawah. | `animateScene`, `playTrace` | Hubungan "baris 4 → top berpindah" harus dirangkai sendiri oleh pemain. |
| P3 | Label dunia SVG 9,5–10,4px dan ID kotak diputar 27°. | Pengukuran §2 | Sulit dibaca, terutama saat kamera 100%. |

Tidak ditemukan bug model yang memutasi data secara salah pada alur yang dibaca.

## 4. Riset pembanding

| Rujukan | Pola yang relevan | Diterapkan sebagai |
|---|---|---|
| Hundhausen, Douglas & Stasko (2002), meta-studi efektivitas visualisasi algoritma | Apa yang dilakukan pelajar dengan visualisasi lebih menentukan daripada isi visualnya. | Setiap layar meminta tindakan atau prediksi, bukan hanya tontonan. |
| Naps dkk. (2002), taksonomi keterlibatan: *viewing → responding → changing → constructing → presenting* | Pembelajaran diduga naik seiring tingkat keterlibatan. | Jenjang level: Prediksi (responding) → Operasikan (changing) → Rakit urutan sendiri (constructing). |
| Python Tutor (Guo, SIGCSE 2013) | Kode dengan baris aktif **bersebelahan** dengan diagram frame/objek; langkah maju-mundur. | Kolom "Lensa" di samping arena: kode + referensi selalu terlihat, sinkron dengan animasi. |
| VisuAlgo (modul List: LL/Stack/Queue/DLL/Deque) | Satu halaman visual + e-Lecture + mode Training kuis yang dinilai instan. | Tantangan pemula dipindah ke arena sebagai mode Latihan dengan penilaian langsung. |
| Human Resource Machine | Level pendek bertingkat, satu konsep per level; jalankan atau langkahkan program; penilaian efisiensi (jumlah langkah). | Level misi dengan target langkah (par) dan bintang. |
| Brilliant | Coba dulu sebelum dijelaskan; hipotesis lalu temukan apakah benar; pelajaran 5–15 menit. | Kunci prediksi sebelum animasi; penjelasan muncul setelah hasil. |
| Predict–Observe–Explain (White & Gunstone 1992; studi simulasi fisika/kimia) | Prediksi + alasan sebelum pengamatan mendukung pemahaman. Belum ada bukti khusus ilmu komputer di riset ini. | Prediksi menahan animasi; setelah hasil, satu kalimat "mengapa" ditautkan ke baris kode. |
| Studi game Stack/Queue (iJIM 2019, *question prompts*; AGBL 2022) | Pertanyaan pemandu di dalam game sebagai scaffolding; hasil pre/post positif. | Petunjuk bertingkat (konsep → arah → langkah), bukan langkah persis sejak awal. |

## 5. Rancangan loop permainan

```
  1. TUJUAN     "Keluarkan B tanpa merusak urutan"
        ▼
  2. PREDIKSI   "Jika pop sekarang, siapa keluar?"  → dikunci sebelum aksi
        ▼
  3. AKSI       tap dock / seret kotak / tombol keyboard
        ▼
  4. AMATI      objek bergerak SINKRON dengan baris kode dan perubahan top/next;
                nilai return mendarat di Baki hasil
        ▼
  5. JELASKAN   satu kalimat penyebab + tautan ke baris kode
        ▼
  6. PROGRES    langkah misi ✓, penghitung langkah vs par, bintang
```

### Jenjang level (usulan)

| # | Stack · Gudang | Queue · Klinik | Tingkat keterlibatan |
|---|---|---|---|
| 1 | Push 3 kotak; tebak top | Enqueue 3 pasien; tebak front/rear | Responding |
| 2 | Pop sampai kosong; amati `None` (underflow) | Dequeue sampai kosong; rear ikut `None` | Responding → Changing |
| 3 | Ambil B yang tertimbun (misi sekarang) | Batalkan pasien di tengah (sambung ulang next) | Changing |
| 4 | Balik urutan A–B–C memakai Bantuan | FIFO dasar dengan jam: layani 3 pasien | Changing |
| 5 | Patuhi batas berat/jumlah saat memindah | Tiga prioritas (misi sekarang) | Changing |
| 6 | Rakit urutan operasi sendiri untuk target, lalu jalankan | Rakit urutan panggil/daftar untuk target | Constructing |

Bintang per level: ★ selesai · ★★ jumlah langkah ≤ par · ★★★ semua prediksi benar tanpa petunjuk tingkat 3. Tantangan pemula 20 soal tetap ada, tetapi dijalankan di arena sebagai bagian level 1–2.

### Petunjuk bertingkat

1. **Konsep** — "Hanya top yang bisa diambil."
2. **Arah** — "Ada 2 barang di atas B."
3. **Langkah** — "Pindahkan D ke Bantuan." (menghapus peluang ★★★)

## 6. Layout optimal

Prinsip: **satu layar = satu loop**. Pada ≥1024×720, tujuan, arena, dock aksi, baki hasil, linked-list, dan kode aktif terlihat tanpa gulir.

### Desktop ≥1200px

```
┌─ Topbar 56px ──────────────────────────────────────────────────────────────┐
│ Logo │ [Stack] [Queue] │ Level 3/6 ★★☆ │                         ⚙   ?     │
├───────────────────────────────────────────────┬────────────────────────────┤
│ ┌ Tujuan (overlay kiri-atas) ┐   kamera ⊕ ⊖ ⟲ │ LENSA                      │
│ │ Ambil B · langkah 2/3 · 4/5│                │ ┌ Linked-list ───────────┐ │
│ │ [Petunjuk]                 │                │ │ top→ D→C→B→A→None      │ │
│ └────────────────────────────┘                │ └────────────────────────┘ │
│                                               │ ┌ Kode · pop() ──────────┐ │
│              ARENA ISOMETRIK                  │ │ 1 def pop(self):       │ │
│              (±62% lebar, tinggi penuh)       │ │ 5▶ self.top = …next    │ │
│                                               │ │ ◀ ▶ ⏯   langkah 4/6    │ │
│                                               │ └────────────────────────┘ │
│ ┌ Baki hasil ┐                                │ ┌ Referensi ─────────────┐ │
│ │ pop() → D  │                                │ │ top: N1·D → N2·C       │ │
│ └────────────┘                                │ └────────────────────────┘ │
│ ┌ DOCK AKSI ──────────────────────────────┐   │ Feedback: "D keluar karena │
│ │ [+ Push] [↑ Pop] [◎ Peek] [∅?] [→ Pindah ▾] │ top berpindah ke next."    │
│ └─────────────────────────────────────────┘   │                            │
└───────────────────────────────────────────────┴────────────────────────────┘
   di bawah lipatan: Materi dan sumber dokumen · JS aktual · Catatan eksperimen
```

### Tablet 768–1199px

Arena penuh lebar (tinggi 55vh) dengan tujuan dan dock di dalamnya; Lensa menjadi dua kolom (linked-list | kode) tepat di bawah arena.

### Ponsel ≤540px

```
┌ Tujuan ringkas · ★ · ? ┐
│ ARENA (48vh, sticky)    │
│ Baki hasil (chip)       │
├─────────────────────────┤
│ Lensa: geser horizontal │  linked-list ⇄ kode ⇄ referensi
├─────────────────────────┤
│ DOCK AKSI (5 ikon+label)│  di atas nav bawah
│ [Stack] [Queue] [Level] │
└─────────────────────────┘
```

### Perubahan komponen

| Sekarang | Usulan |
|---|---|
| Formulir push 4 isian | Tombol **+ Push** satu tap (ID otomatis, berat acak 1–5). Formulir lengkap pindah ke popover "Barang kustom". |
| Aksi cepat di bawah arena + panel kontrol kanan (duplikat) | Satu **dock aksi** di dalam arena; panel kanan diganti Lensa. Kapasitas, pencarian, mode di popover ⚙ arena. |
| Kotak pop memudar hilang | Kotak terbang ke **Baki hasil**; `None` tampil sebagai chip kosong bergaris. |
| Rekaman kode diputar terpisah | Animasi objek dipecah per frame rekaman; baris kode aktif menyala bersamaan. |
| Petunjuk selalu persis | Tombol **Petunjuk** 3 tingkat. |
| Queue default prioritas | Default **FIFO dasar**; prioritas terbuka di level 5. |
| Tombol jam `+1 menit` / `Kejadian berikut` | Satu kontrol waktu di HUD jam arena: ⏭ Selesaikan pelayanan + ▸ 1 menit. |
| Label SVG 9,5–10,4px | Minimum 12px setelah skala; ID kotak tidak diputar, ditaruh di sisi depan. |

## 7. Prioritas implementasi

1. Layout satu-layar (arena + dock + Lensa) — memperbaiki loop terpecah.
2. Baki hasil + sinkron animasi–kode.
3. Petunjuk bertingkat + prediksi yang mengunci aksi.
4. Jenjang level dan bintang (data level baru; model tidak berubah).
5. Push satu tap, Queue default FIFO, kontrol waktu di HUD.

## 8. Batas

- Pengukuran dari satu viewport Chromium; belum pada perangkat fisik.
- Rujukan riset berasal dari ringkasan sekunder; angka efek tidak dikutip.
- Rancangan belum diuji dengan mahasiswa; jenjang level adalah usulan.

---

# Fase 2 · Layout, style, tipografi, palet warna

Bukti: `styles.css` (statistik deklarasi), nilai terhitung (computed) dari DOM di Chromium pada 1440×900, 768×1024, dan 390×844, serta pencarian skill ui-ux-pro-max (domain `typography` dan `color`).

## 9. Pengukuran

| Ukuran | 1440×900 | 768×1024 | 390×844 |
|---|---|---|---|
| Arena mulai (Y) | 583 | 662 | **774** (lipatan 776 dikurangi nav bawah 68 → arena tidak terlihat di layar pertama) |
| Tinggi dokumen | — | 3.858px | 4.242px |
| Skala SVG | 0,95 | 0,69 | 0,47 |
| ID kotak (11 unit SVG) | 10,4px | **7,6px** | **5,2px** |
| Metadata rak (10 unit SVG) | 9,5px | 6,9px | **4,7px** |

Statistik CSS: **157** hex unik (CSS + JS), **14** nilai radius, **13** bayangan, **12** ukuran font HTML terhitung (10, 11, 12, 13, 14, 15, 16, 18, 21, 25, 26, 34), 14 nilai `gap`, 18 nilai padding, 8 breakpoint berbeda (380, 540, 700, 900, 1050, 1051, 1200, 1600).

Kontras teks HTML: 7 pasangan di bawah ambang. Yang bermakna hanya label `Praktikum 6` (12px, 4,47:1); sisanya pemisah `/` dekoratif dan panah `→` 16px (3,68:1, lulus sebagai grafik ≥3:1).

## 10. Temuan layout

| P | Temuan | Bukti | Usulan |
|---|---|---|---|
| P1 | Pada ponsel, arena tidak terlihat di layar pertama; judul, prinsip, tantangan, dan misi mendahuluinya. | Arena Y=774 pada 390×844 | Arena di layar pertama (lihat §6). Judul ruang jadi baris 1 di topbar ringkas; tantangan & misi masuk kartu tujuan di dalam arena. |
| P1 | Teks dunia SVG menyusut linear bersama viewBox 940×570: 5,2px di ponsel, 7,6px di tablet. | Tabel §9 | Label ID dan metadata dipindah ke lapisan HTML yang diposisikan dari koordinat SVG (ukuran tetap 12–13px), atau `viewBox` dipotong per breakpoint (ponsel: fokus satu rak + tetangga). |
| P2 | Navigasi ruang ganda di desktop: rail kiri **dan** pemilih ruang di topbar menjalankan aksi yang sama. | `index.html` `.rail` dan `.room-switch` | Pertahankan satu: tab ruang di topbar (≥768px), nav bawah (ponsel). Rail 84px dihapus → arena +84px lebar. |
| P2 | Topbar 92px + judul halaman + kartu tantangan memakan 583px sebelum arena. | Pengukuran desktop | Topbar 56px berisi logo, tab ruang, progres level; judul ruang + prinsip LIFO/FIFO jadi chip di topbar. |
| P2 | Panel kanan 360px × 819px tinggi, didominasi formulir. | `.inspector` | Ganti dengan Lensa (§6). Formulir ke popover. |
| P2 | Hierarki section terbalik: `Bedah Eksekusi` h2 26px lebih besar daripada misi (18px) dan judul panel (16px). | Ukuran h2 terhitung | Semua judul section memakai satu tingkat skala; penekanan lewat posisi, bukan ukuran. |
| P3 | 8 breakpoint, termasuk pasangan 1050/1051. | `@media` | Tiga titik: 600, 960, 1280. |

## 11. Temuan style

| P | Temuan | Usulan |
|---|---|---|
| P2 | Kesan *dashboard*, bukan *game*: arena adalah kartu (radius 15px, border, bayangan) di dalam halaman berkartu; misi, toolbar, footer, feedback menumpuk sebagai pita di dalamnya. | Arena menjadi *stage* tepi-ke-tepi; tujuan, kamera, baki hasil, dan dock menjadi HUD mengambang di atas stage. Kartu hanya untuk Lensa. |
| P2 | Drift token: 157 hex, 14 radius, 13 bayangan, 18 padding. | Token terbatas (§13): ±16 warna, 3 radius + pill, 2 bayangan, skala spasi 4px. |
| P3 | Wordmark 25px bersaing dengan H1 34px di jarak 100px. | Wordmark 18px di topbar 56px. |
| P3 | Latar arena (gradien radial + grid titik + gradien lantai) sudah halus dan mendukung kedalaman. | Pertahankan. |

## 12. Temuan tipografi

| P | Temuan | Bukti | Usulan |
|---|---|---|---|
| P2 | **Bold palsu**: `strong` (mis. "LIFO") dirender `font-weight:700`, padahal hanya Ubuntu 400 dan 500 yang dimuat → browser menebalkan secara sintetis. | Computed `700` pada `STRONG` | `strong, b { font-weight:500 }`. |
| P2 | 12 ukuran tanpa skala; label rail 10px, `.code-language` 11px masih di bawah minimum 12px. | Histogram §9 | Skala 7 langkah (§13). Minimum 12px untuk semua teks, termasuk SVG setelah skala. |
| P3 | Teks dunia diputar 27° pada sisi kotak. | `app.js:201` | ID horizontal pada label depan kotak; rotasi hanya untuk dekorasi. |
| P3 | Pasangan font skill (Baloo 2/Comic Neue, Fredoka/Nunito) ditujukan untuk anak-anak; tidak cocok untuk mahasiswa. Ubuntu humanis + Consolas sudah tepat dan merupakan komitmen brand. | Hasil `--domain typography` | Pertahankan Ubuntu lokal. Tambahkan `font-variant-numeric: tabular-nums` global untuk angka HUD. |

## 13. Temuan palet warna

| P | Temuan | Bukti | Usulan |
|---|---|---|---|
| P1 | **Prioritas pasien dibedakan oleh tiga biru** (indigo `#2F39A9`, biru `#2E6FA0`, cyan `#49A4BB`). Kritis vs darurat sulit dibedakan dan tidak terasa mendesak. | `person()` `app.js:215`; legenda Queue | Konvensi triase: kritis = merah, darurat = amber, non-darurat = cyan; tambah bentuk/ikon (misal pita di bahu) agar tidak bergantung warna saja. |
| P1 | Warna kotak Stack dipilih dari `charCodeAt % 3` → warna tidak bermakna, tetapi pemain wajar mengira bermakna. | `app.js:197` | Kotak netral satu warna (indigo-biru). Warna hanya untuk **status**: terpilih, target, bergerak, gagal. |
| P2 | Turquoise dipakai untuk pilihan, target misi, drop zone, garis lantai, dan titik live — satu warna, lima arti. | `colors[3]`, `.target-ring`, `.drop-zone`, `floor()` | Turquoise = pilihan/drop saja. Target misi & bintang = aksen hangat baru. |
| P2 | Palet seluruhnya dingin; tidak ada warna hangat untuk *reward*/perhatian selain merah danger. Palet edukasi di skill (LMS, Kids Learning) selalu memasangkan primer dingin dengan aksen amber. | Hasil `--domain color` | Tambah **amber** untuk target, bintang, baki hasil saat nilai baru. |
| P2 | Outline/penanda pilihan turquoise `#15D8B3` hanya **1,83:1** dan cyan `#49A4BB` **2,87:1** pada putih — di bawah 3:1 untuk komponen grafis (WCAG 1.4.11). Pilihan dan batas jalur sulit terlihat. | Kontras terhitung | Isi tetap turquoise terang, tetapi garis/outline pilihan memakai `#0E9E82` (3,37:1) dan garis struktur `#2F8AA0` (3,99:1). |
| P3 | `Praktikum 6` 4,47:1. | Kontras terhitung | Teks `--ink-2` pada `--surface-2`. |

### Token usulan

Empat aksen pengguna dipertahankan; ditambah satu hangat dan peran semantik.

| Token | Nilai | Peran |
|---|---|---|
| `--action` | `#2F39A9` | Tombol utama, tab aktif — satu per tampilan |
| `--action-hover` | `#252F92` | Hover |
| `--ref` | `#2E6FA0` | top / front / rear / next, baris kode aktif, fokus |
| `--structure` | `#49A4BB` | Rak, jalur, garis struktur |
| `--structure-line` | `#2F8AA0` | Garis rak/jalur yang harus terlihat (3,99:1) |
| `--select` | `#15D8B3` | Isi pilihan, drop zone (bukan teks, bukan garis tipis) |
| `--select-line` | `#0E9E82` | Outline pilihan (3,37:1) |
| `--select-ink` | `#087C69` | Teks sukses |
| `--goal` | `#B9730F` | Target misi, bintang, nilai return baru (3,80:1) |
| `--goal-ink` | `#8A5A0B` | Teks amber (5,92:1 putih; 5,29:1 pada `#FBF1E0`) |
| `--danger` | `#B24555` | Underflow, gagal, pasien kritis |
| `--ink` / `--ink-2` | `#222944` / `#606B85` | Teks utama / sekunder |
| `--surface-0/1/2` | `#F4F5F9` / `#FAFBFE` / `#FFFFFF` | Halaman / stage / kartu |
| `--line` / `--line-strong` | `#E0E4EE` / `#C6D0E2` | Garis |

Kontras di tabel dihitung dengan rumus luminans relatif WCAG terhadap `#FFFFFF`. Amber terang `#D98A1C` (2,76:1) ditolak karena gagal 3:1.

### Skala tipografi (rasio ±1,2, dasar 15px)

| Token | px / line-height | Pakai |
|---|---|---|
| `--t-meta` | 12 / 1.4 | Metadata, badge, label SVG minimum |
| `--t-label` | 13 / 1.4 | Label field, tombol dock |
| `--t-body` | 15 / 1.6 | Teks UI |
| `--t-lead` | 16 / 1.7 | Penjelasan edukasi, feedback |
| `--t-title` | 18 / 1.35 | Judul kartu, tujuan |
| `--t-section` | 22 / 1.25 | Judul section |
| `--t-display` | 28 / 1.15 | Judul ruang (hanya bila tidak di topbar) |
| `--t-code` | 13 / 1.9 mono | Kode, pointer |

Bentuk: radius `6` (kontrol) · `10` (HUD, chip besar) · `16` (kartu) · pill; bayangan `--shadow-1` (HUD) dan `--shadow-2` (dialog/drag); spasi 4 · 8 · 12 · 16 · 24 · 32.

## 14. Urutan implementasi gabungan (fase 1 + 2)

1. Token warna/tipe/radius/bayangan + perbaikan bold palsu (risiko rendah, dasar semua langkah berikut).
2. Layout satu layar: topbar 56px, hapus rail, arena sebagai stage + HUD, Lensa.
3. Label dunia sebagai lapisan HTML (min 12px) + viewBox ponsel.
4. Warna bermakna: kotak netral, prioritas triase, amber untuk target/bintang.
5. Gameplay fase 1: baki hasil, sinkron animasi–kode, petunjuk bertingkat, level.

---

# Fase 3 · Animasi dan kejelasan edukasi

Bukti: `app.js` (`animateScene`, `applyCamera`, `renderMission`, `playTrace`, `motionAllowed`), `styles.css` (transition, reduced motion), uji WAAPI langsung di Chromium, dan acuan audit animasi Emil Kowalski (skill improve-animations).

## 15. Inventaris gerak

| Gerak | Durasi · easing | Pemicu | Catatan |
|---|---|---|---|
| Kotak/pasien pindah (lintasan angkat) | 560ms / kecepatan · `cubic-bezier(.65,0,.25,1)` | push, transfer, enqueue, panggil | Ease-in-out untuk gerak di layar: tepat. Durasi >300ms wajar karena bersifat menjelaskan; ada pengatur kecepatan. |
| Objek keluar (pop/dequeue) | 250ms · `cubic-bezier(.16,1,.3,1)` | pop, dequeue, batal | **Rusak**, lihat A1. |
| Kamera zoom/fokus | 260ms · `(.16,1,.3,1)` | tombol kamera, cari | Tepat. |
| Node linked-list masuk | 200ms · translateX(-10px) | objek baru | Tepat. |
| Banner misi selesai | 260ms masuk; hilang di 3.500ms tanpa transisi | misi selesai | Lihat A5. |
| Putar rekaman kode | interval 1.100ms / kecepatan | tombol Putar | Terpisah dari gerak arena. |
| Tekan tombol | scale(.97) 140ms | semua tombol | Tepat. |

Token easing sudah konsisten (`--ease`, `--move`, masing-masing satu nilai). Tidak ada `transition: all`, `scale(0)`, atau properti layout yang dianimasikan.

## 16. Temuan animasi

| # | Tingkat | Kategori | Lokasi | Temuan | Arah perbaikan |
|---|---|---|---|---|---|
| A1 | HIGH | Bug / fisikalitas | `app.js:380` | Klon keluar memakai `transform:'translate(0,-65)'` **tanpa satuan**. WAAPI menolak keyframe ini (`getKeyframes()` → `null`), sehingga matrix di tengah animasi tetap `(1,0,0,1,0,0)`. Kotak yang di-pop hanya memudar di tempat. Dengan `px`, kotak naik 32,5px di tengah animasi. | `translate(0px,-65px)`. Lebih baik lagi: terbang ke Baki hasil (fase 1). |
| A2 | HIGH | Aksesibilitas / tujuan | `app.js:23` `motionAllowed` | Pengguna keyboard **tidak pernah** melihat animasi penjelas (`!keyboardInput`). DESIGN.md hanya meminta transisi *tombol* dimatikan di mode keyboard. Gerak di arena bersifat konten, bukan dekorasi. | Pisahkan: mode keyboard mematikan transisi tombol saja; gerak arena tetap mengikuti preferensi gerak. |
| A3 | MEDIUM | Aksesibilitas | `motionAllowed`, reduced motion | Gerakan minimal menghapus **semua** isyarat; push/pop berpindah seketika tanpa penanda apa yang berubah. Reduced motion berarti lebih sedikit gerak, bukan nol penjelasan. | Pada reduced motion: tanpa translasi, tetapi beri sorot/outline 600ms pada objek yang berubah, plus penanda "baru" atau "keluar" statis. |
| A4 | MEDIUM | Kesatuan penjelasan | `animateScene` vs `playTrace` | Satu lintasan 560ms mewakili seluruh operasi, sedangkan rekaman memiliki 4–8 frame. Transfer direkam dua fase (push tujuan, lalu pop sumber), tetapi tampil sebagai satu pindah. | Mode "langkah demi langkah": tiap frame rekaman = satu potongan gerak (node dibuat → next disambung → top berpindah), baris kode menyala bersamaan. Mode cepat tetap satu lintasan. |
| A5 | LOW | Fisikalitas | `app.js:321` | Banner misi masuk dengan animasi, tetapi hilang seketika (`hidden=true`). | Keluar 180ms opacity + translateY(-4px), lebih cepat daripada masuk. |
| A6 | LOW | Missed | `endDrag`, `pointerup` | Drag yang dilepas di luar rak: bayangan hilang seketika, kotak asli muncul lagi. Tidak ada isyarat "kembali ke asal". | Bayangan meluncur kembali ke posisi awal 200ms ease-out. |
| A7 | LOW | Missed | `renderMission` | Momen langka (misi selesai) hanya mendapat banner kecil 3,5 detik. Momen langka boleh memakai anggaran "delight". | Ringkasan selesai: bintang muncul berurutan (stagger 60ms), jumlah langkah vs par, satu pertanyaan refleksi (§18). |
| A8 | LOW | Missed | `renderFeedback`, HUD | Teks feedback dan HUD berganti seketika; perubahan sering tidak tertangkap mata saat perhatian ada di arena. | Crossfade 150ms pada feedback; sorot singkat nilai yang berubah (top, front, jumlah). |

Tidak dilaporkan: kamera yang bergerak membatalkan animasi objek (keputusan tercatat di DESIGN.md); durasi 560ms (bersifat menjelaskan dan dapat diatur).

## 17. Temuan kejelasan edukasi

| # | P | Temuan | Bukti | Usulan |
|---|---|---|---|---|
| E1 | P1 | **`peek()` Queue berbeda dari pasien yang akan dipanggil.** Pada mode prioritas, peek/isEmpty membaca jalur *terpilih*, sedangkan Panggil memilih jalur prioritas tertinggi yang berisi. Pemain bisa melihat `peek() → P01` lalu Panggil melayani P04. | `app.js:516` (`clinic.queues[selectedQueue]`) vs `Clinic.call` | Label eksplisit: "peek() jalur Darurat". Tambah "Berikutnya dilayani: P04" di HUD loket, terpisah dari peek. |
| E2 | P1 | **Arah baca urutan tidak konsisten.** Misi menyebut "A–C–D" (dasar → atas), sedangkan linked-list dan feedback memakai top → dasar ("D → C → A"). | `renderMission` teks misi & banner; `renderNodes` | Selalu tulis dengan arah eksplisit: "top → D → C → A". Hindari urutan tanpa penanda arah. |
| E3 | P2 | Catatan kompleksitas di bawah diagram utama menggabungkan "Push/pop inti: O(1)" dengan "perekaman node menambah O(n) per langkah". Pemula dapat menyimpulkan push itu O(n). | `renderNodes` `structure-note` | Diagram utama: hanya O(1)/O(n) operasi. Catatan biaya perekaman pindah ke disclosure Bedah Eksekusi. |
| E4 | P2 | Transfer direkam sebagai push tujuan lalu pop sumber, tanpa langkah `peek` yang sebenarnya dijalankan pertama. Urutan ini berbeda dari intuisi "ambil dulu, baru taruh". | `transfer()` di `model.js`; konteks rekaman `app.js:433` | Tampilkan tiga fase: peek sumber → push tujuan (bisa gagal karena kapasitas) → pop sumber, beserta alasannya: sumber tidak berubah bila tujuan penuh. |
| E5 | P2 | Bedah Eksekusi diawali paragraf penafian panjang (bukan interpreter, N1 bukan alamat RAM, bukan garbage collector). Penting dan jujur, tetapi muncul sebelum isi. | `.execution-contract`, `.memory-legend` | Satu baris ringkas + ikon info yang membuka penjelasan lengkap. |
| E6 | P2 | Fase *Explain* dari predict–observe–explain belum ada: setelah misi atau soal, pemain tidak diminta menjelaskan mengapa. | `renderMission`, `answerWarmup` | Satu pertanyaan sebab setelah misi, misal "Mengapa C harus dikembalikan sebelum D?" dengan 3 pilihan alasan. |
| E7 | P3 | `isEmpty()` pada Queue prioritas hanya memeriksa jalur terpilih, padahal "antrean klinik kosong" berarti ketiga jalur kosong. | `app.js:517` | Label "isEmpty() jalur X"; opsional tombol "semua jalur kosong?". |
| E8 | P3 | Istilah ganda konsisten (Ambil / pop, Daftarkan / enqueue) — **pertahankan**. Feedback operasi sudah menyebut nilai return dan top baru — **pertahankan**. | `notify(...)` | — |

## 18. Prinsip gerak edukatif (usulan untuk implementasi)

1. **Gerak = penjelasan.** Setiap gerak arena dipetakan ke satu frame rekaman; tidak ada gerak tanpa padanan referensi.
2. **Satu sumber waktu.** Arena, baris kode, dan linked-list maju bersama dari indeks frame yang sama; pengatur kecepatan mengatur ketiganya.
3. **Reduced motion tetap menjelaskan** melalui sorot, outline, dan teks, bukan translasi.
4. **Keyboard setara pointer** untuk gerak konten.
5. **Keluar lebih cepat daripada masuk**; momen langka (misi selesai) boleh lebih ekspresif.

## 19. Urutan implementasi final (fase 1–3)

1. Perbaikan cepat: A1 (`px`), A2 (gating keyboard), E2 (arah baca), E3 (catatan kompleksitas), bold palsu.
2. Token warna/tipe/radius/bayangan.
3. Layout satu layar: topbar 56px, arena sebagai stage + HUD, Lensa.
4. Label dunia HTML (min 12px) + viewBox ponsel.
5. Warna bermakna (kotak netral, triase, amber).
6. Baki hasil + sinkron gerak–kode per frame (A4) + reduced motion yang menjelaskan (A3).
7. Petunjuk bertingkat, prediksi pengunci, fase Explain (E6), level & bintang.
8. Queue: peek/isEmpty per jalur berlabel + "berikutnya dilayani" (E1, E7); default FIFO.

## 20. Status implementasi

Status ini mengikuti branch `uiux-overhaul`. Pemetaan task mengikuti lampiran rencana (`docs/superpowers/plans/2026-10-15-strukdat-uiux-overhaul.md`); hash commit adalah hash pendek pada riwayat branch.

### 20.1 Temuan §3 (gameplay)

| Temuan | Prioritas | Task | Commit | Status |
|---|---|---|---|---|
| Loop aksi–hasil–kode terpecah | P1 | 4, 7 | f5e371b, 6cc51ed | Selesai |
| Petunjuk misi selalu berupa langkah persis | P1 | 9 | 7afae38 | Selesai |
| Prediksi hanya muncul saat misi aktif | P1 | 9 | 7afae38 | Selesai |
| Satu misi per ruang, tanpa jenjang | P1 | 10 | f29f97f | Selesai |
| Tantangan pemula terpisah dari arena | P2 | 4, 10 | f5e371b, f29f97f | Selesai |
| Push memerlukan formulir empat isian | P2 | 8 | f2e596b | Selesai |
| Nilai kembali tidak punya wujud | P2 | 6 | 6bf115b | Selesai |
| Queue dibuka dalam mode prioritas | P2 | 8 | f2e596b | Selesai |
| Kontrol waktu Queue bercampur dengan operasi | P2 | 8 | f2e596b | Selesai |
| Gerak kode tidak sinkron dengan gerak objek | P3 | 7 | 6cc51ed | Selesai |
| Label SVG kecil dan ID diputar | P3 | 5 | d583dc1 | Selesai |

### 20.2 Temuan §10–13 (layout, style, tipografi, palet)

| Temuan | Task | Commit | Status |
|---|---|---|---|
| §10 Layout: arena di bawah lipatan, rail ganda, topbar, panel form, hierarki, breakpoint | 4, 12 | f5e371b, 0a7c3ea, 368deb7, CSS dan dokumentasi pada task ini | Selesai |
| §11 Style: kesan dashboard, drift token, wordmark | 2, 4, 12 | c5a667d, f5e371b, 1330aaa | Selesai |
| §12 Tipografi: bold palsu, dua belas ukuran, ID diputar | 1, 2, 5 | bdb8b8f, c5a667d, d583dc1 | Selesai |
| §13 Palet: prioritas biru, warna kotak acak, turquoise lima arti, kontras outline | 2, 3 | c5a667d, 9467461 | Selesai |

### 20.3 Temuan animasi (A1–A8) dan kejelasan edukasi (E1–E8)

| Temuan | Task | Commit | Status |
|---|---|---|---|
| A1 translate tanpa satuan | 1 | bdb8b8f | Selesai |
| A2 keyboard tanpa gerak arena | 1 | bdb8b8f | Selesai |
| A3 reduced motion tanpa isyarat | 6 | 6bf115b | Selesai |
| A4 gerak tidak terhubung ke rekaman | 7 | 6cc51ed | Selesai |
| A5 banner misi keluar tanpa animasi | 6 | 6bf115b | Selesai |
| A6 drag yang dilepas di luar rak | 6 | 6bf115b | Selesai |
| A7 momen selesai misi hanya banner kecil | 10 | f29f97f | Selesai |
| A8 feedback dan HUD berganti seketika | 6 | 6bf115b | Selesai |
| E1 peek Queue berbeda dari pasien yang dipanggil | 8 | f2e596b | Selesai |
| E2 arah baca urutan tidak konsisten | 1 | bdb8b8f | Selesai |
| E3 catatan kompleksitas bercampur | 1 | bdb8b8f | Selesai |
| E4 urutan transfer tidak dijelaskan | 11 | 0d00d3d | Selesai |
| E5 penafian Bedah Eksekusi terlalu panjang | 11 | 0d00d3d | Selesai |
| E6 fase Explain belum ada | 10 | f29f97f | Selesai |
| E7 isEmpty Queue hanya memeriksa jalur terpilih | 8 | f2e596b | Selesai |
| E8 istilah ganda dan feedback dipertahankan | Global Constraints | tidak berubah | Dipertahankan |

### 20.4 Keputusan dan perbaikan koordinator selama eksekusi

- Commit tidak memakai trailer `Co-Authored-By` karena hook repo menolak trailer tersebut.
- Pada ponsel, prinsip LIFO/FIFO tetap terlihat sebagai chip ringkas. Rencana awal menyembunyikannya, tetapi `DESIGN.md` mewajibkan prinsip tersebut pada semua ukuran.
- Pada skala kecil, baris metadata rak di SVG disembunyikan (`compact-labels`). Jumlah tetap tampil di HUD dan Lensa. Kontrol kamera ponsel tersusun vertikal.
- Label dock mempertahankan istilah ganda: Simpan / push, Ambil / pop, Lihat / peek, Daftar / enqueue, dan Panggil / dequeue.
- Ditambahkan `.result-tray[hidden]{display:none}` agar baki kosong tetap tersembunyi.
- Tes prediksi diarahkan ke `#mission-predict`. Tes prediksi Queue mengatur `queueMode='priority'` seperti handler misi sungguhan.
- Perbaikan dari permainan langsung: chip level menampilkan bintang pada render yang menyelesaikan level (`0b7f5c8`). Pemulihan fokus tidak lagi melempar error untuk form tanpa id, yaitu dialog konfirmasi (`7485079`).

### 20.5 Pengukuran yang dipakai

Angka berikut berasal dari pengukuran yang sudah tercatat di audit ini; tidak diukur ulang pada task ini.

- Desktop 1440×900: arena dimulai pada Y=253, dock aksi pada Y=820, dan kode di Lensa pada Y=691.
- Ponsel 390×844: arena dimulai pada Y=289, dan teks SVG terkecil 12px.

### 20.6 Belum diverifikasi

- Tes Playwright (`tests/browser.cjs`, `tests/browser-audit.cjs`) belum dijalankan karena Playwright tidak terpasang. Screenshot `screenshots/audit/*` belum diperbarui.
- Feel-check manual (Step 4 rencana) belum dilakukan di Browser pane.
- Perangkat fisik, pembaca layar, dan pengguna mahasiswa nyata belum diuji.


## Sumber

- [Ringkasan meta-studi Hundhausen dkk. 2002 dan taksonomi Naps dkk. 2002](https://www.scitepress.org/Papers/2009/18251/pdf/index.html)
- [Naps dkk. 2002 — Exploring the role of visualization and engagement](https://rex.libraries.wsu.edu/esploro/outputs/journalArticle/Exploring-the-role-of-visualization-and/99900547176001842)
- [VisuAlgo — LL, Stack, Queue, DLL, Deque](https://visualgo.net/en/list)
- [Online Python Tutor — SIGCSE 2013](https://pg.ucsd.edu/publications/Online-Python-Tutor-web-based-program-visualization_SIGCSE-2013.pdf)
- [Human Resource Machine — Wikipedia](https://en.wikipedia.org/wiki/Human_Resource_Machine)
- [Brilliant — interactive play (UX Collective)](https://uxdesign.cc/the-key-to-learning-math-and-science-online-is-interactive-play-6ea68ce167fe)
- [Predict–Observe–Explain dengan simulasi](https://avesis.metu.edu.tr/yayin/29d6c4b4-b5cb-433e-8740-c51e7ac6d0de/an-experimental-study-exploring-the-effects-of-predictobserveexplain-method-supported-with-simulations)
- [Digital Game Based Learning of Stack Using Question Prompts (iJIM)](https://online-journals.org/index.php/i-jim/article/view/10778)
- [Animated game-based learning untuk array, stack, queue](https://koreascience.or.kr/article/JAKO202227152336594.pdf)
- [Emil Kowalski — filosofi animasi antarmuka](https://emilkowal.ski/)
