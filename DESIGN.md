---
name: Strukdat Gaming
description: Arena isometrik untuk belajar Stack dan Queue lewat aksi dan referensi linked-list.
colors:
  indigo: "#2f39a9"
  blue: "#2e6fa0"
  cyan: "#49a4bb"
  teal: "#15d8b3"
  teal-ink: "#087c69"
  paper: "#f4f5f9"
  white: "#fff"
  ink: "#222944"
  muted: "#606b85"
  pale: "#eef0fc"
  line: "#e0e4ee"
  danger: "#b24555"
  indigo-hover: "#252f92"
typography:
  headline:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "34px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-.9px"
  title:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "11px"
  code:
    fontFamily: "Consolas, monospace"
    fontSize: "11px"
    lineHeight: 2.15
rounded:
  field: "6px"
  button: "7px"
  overlay: "8px"
  navigation: "10px"
  log: "12px"
  panel: "15px"
spacing:
  compact-gap: "5px"
  form-gap: "10px"
  panel-inset: "20px"
  workspace-gap: "22px"
  page-inline: "36px"
components:
  button-primary:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.white}"
    rounded: "{rounded.button}"
    padding: "11px 10px"
  button-primary-hover:
    backgroundColor: "{colors.indigo-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.indigo}"
    rounded: "{rounded.button}"
    padding: "9px 11px"
  button-secondary-hover:
    backgroundColor: "{colors.pale}"
  input-field:
    backgroundColor: "#fafbfe"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "9px 10px"
    height: "37px"
  room-navigation:
    backgroundColor: "#f7f8fb"
    textColor: "{colors.muted}"
    rounded: "{rounded.navigation}"
    padding: "4px"
  room-navigation-active:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.white}"
    rounded: "{rounded.button}"
    padding: "10px 19px"
  mission-chip:
    backgroundColor: "{colors.pale}"
    textColor: "{colors.indigo}"
    rounded: "4px"
    padding: "3px 7px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.panel}"
  linked-node:
    backgroundColor: "#f0f2fc"
    textColor: "{colors.indigo}"
    rounded: "{rounded.button}"
  linked-node-selected:
    backgroundColor: "#e7f8f8"
---

# Design System: Strukdat Gaming

## Overview

**Creative North Star: "Arena Isometrik Putih–Silver"**

Strukdat Gaming menempatkan tindakan belajar dalam arena isometrik terang: kotak modular biru, jalur pasien, permukaan putih–silver, dan penanda turquoise. Karakternya modern, bersih, dan agak futuristik sesuai arahan pengguna. Bentuk dunia berasal dari SVG yang digambar khusus; antarmuka memakai permukaan tenang, garis tipis, dan kontrol yang langsung dapat digunakan.

Gerak menjelaskan perpindahan objek dan perubahan perhatian. Animasi selesai setelah tindakan; kamera dapat diperbesar atau difokuskan ke pilihan. Diagram linked-list dan jejak Python memberi lapisan inspeksi yang menjaga kebenaran referensi. Tindakan langsung memiliki alternatif tombol, keyboard, dan gerakan minimal.

**Key Characteristics:**

- Arena SVG isometrik dengan objek modular yang dapat dipilih.
- Dasar putih–silver dengan aksen indigo, biru, cyan, dan turquoise.
- Tipografi Ubuntu lokal dan kode monospace.
- Gerakan singkat, berhingga, dan terkait tindakan.
- Status terbaca melalui label, diagram referensi, dan umpan balik.

## Colors

Palet bergerak dari indigo teknis menuju turquoise aktif di atas permukaan putih dan silver dingin; frontmatter merupakan sumber nilai normatif.

### Primary

- **Indigo Arena** (`indigo`): tombol utama, navigasi aktif, identitas, penanda top aktif, dan kode yang sedang ditelusuri.
- **Indigo Dalam** (`indigo-hover`): respons hover tombol utama.

### Secondary

- **Biru Operator** (`blue`): referensi, fokus keyboard, informasi operasi, dan jalur darurat.
- **Cyan Jalur** (`cyan`): sisi arena, batas pilihan, detail struktural, dan jalur non-darurat.

### Tertiary

- **Turquoise Aksi** (`teal`): penanda pilihan, target misi, area drop, garis energi arena, dan titik status.
- **Hijau Teks Keberhasilan** (`teal-ink`): teks penyelesaian dan langkah yang selesai. Turquoise terang berfungsi sebagai penanda visual; teks keberhasilan menggunakan pasangan gelap ini.
- **Merah Peringatan** (`danger`): tindakan pembatalan dan penanda bahaya; bukan aksen dekoratif.

### Neutral

- **Silver Halaman** (`paper`): latar halaman.
- **Putih Panel** (`white`): kontrol, navigasi, panel utama, dan label dunia.
- **Tinta Dingin** (`ink`): teks utama.
- **Abu Informasi** (`muted`): keterangan dan label pendamping.
- **Indigo Pucat** (`pale`): pilihan, tombol pendamping, dan badge misi.
- **Garis Silver** (`line`): pemisah, batas panel, dan kontrol.

**The Light Arena Rule.** Pertahankan dasar putih–silver dan gunakan warna aksen untuk objek, tindakan, pilihan, serta referensi.

## Typography

**Display / Body Font:** Ubuntu lokal, dengan Segoe UI dan sans-serif sebagai fallback. File Regular dan Medium dimuat dari aset proyek.

**Label / Mono Font:** Ubuntu untuk label antarmuka; Consolas dengan fallback monospace untuk kode, pointer, dan hitungan tertentu.

**Character:** Huruf humanis yang ringkas membuat dunia teknis terasa ramah. Monospace menandai informasi referensi tanpa mengubah seluruh antarmuka menjadi terminal.

### Hierarchy

- **Headline**: judul ruang mengikuti token `headline`; pada layar kecil ukuran menjadi 29px.
- **Title**: judul panel mengikuti token `title`.
- **Body**: dasar halaman mengikuti token `body`; penjelasan ruang menggunakan 12px dengan line-height 1.65 dan lebar maksimum 620px.
- **Label**: label field menggunakan token `label`; badge dan keterangan ringkas pada implementasi berkisar 9–11px.
- **Code**: jejak Python mengikuti token `code`, sedangkan diagram data memakai monospace 13px.
- **Wordmark**: identitas memakai 25px, bobot 500, letter-spacing -.8px; menjadi 24px lalu 21px pada breakpoint lebih kecil.

Angka jam, kapasitas, dan laporan memakai angka tabular. Label menggunakan kalimat biasa; tidak ada sistem huruf kapital wajib.

## Layout

Model ruang adalah rail navigasi tetap, topbar, judul ruang, lalu arena dan panel operator. Rail desktop selebar 84px; shell dimulai setelah rail. Topbar setinggi 92px. Area utama terpusat dengan lebar maksimum 1680px dan inset 28px 36px 16px. Workspace memiliki kolom arena fleksibel dan panel operator 320px, dipisahkan 22px. Di atas 1600px panel operator menjadi 350px.

Pada 1200px atau kurang, inset horizontal menjadi 24px, panel operator 300px, dan gap workspace 16px. Beberapa keterangan sekunder disembunyikan; footer arena dan bagian misi dapat membungkus. Pada 900px atau kurang rail menjadi 66px, topbar membungkus dengan pemilih ruang selebar baris, workspace menjadi satu kolom, dan panel operator membagi kontrol serta jejak menjadi dua kolom.

Pada 540px atau kurang rail menjadi 52px, inset halaman 12px, panel operator menjadi satu kolom, dan field memakai font 16px dengan tinggi 40px. SVG memakai lebar 150% dan offset kiri -25% untuk menjaga ukuran objek. Pada seluruh layar 900px atau kurang, arena menyediakan ruang bawah 68px. Petunjuk berada pada baris tersendiri dengan margin horizontal 10px. Kontrol kamera berukuran 44 × 44px, dan tombol operasi cepat setinggi minimum 44px tampil tepat setelah dunia, termasuk pada panel browser dan tablet. Bilah kamera dibatasi oleh lebar arena agar tidak terpotong pada layar 320px. Di bawah 380px ikon pendamping operasi cepat disembunyikan; nama tindakan tetap terlihat.

Dunia menggunakan viewBox 940 × 570. Diagram node dan jejak kode dapat bergulir secara horizontal tanpa memaksakan lebar halaman. Kontrol yang lebih panjang tetap di panel operator; operasi cepat menyediakan akses dekat dunia pada ponsel, tablet, dan panel browser sempit.

## Elevation & Depth

Panel memakai bayangan ambient yang sangat halus dan garis batas, sedangkan kedalaman utama dibentuk oleh geometri isometrik: sisi objek berbeda nada, lantai berlapis, grid miring, dan bayangan SVG lembut. Cahaya bukan dekorasi bergerak; kontras permukaan menjaga kontrol dan objek terpisah.

### Shadow Vocabulary

- **Panel ambient** (`0 8px 30px #29345a08`): arena dan panel operator, melalui `--shadow`.
- **Tombol utama** (`0 4px 9px #2f39a911`): sedikit tinggi untuk tindakan utama.
- **Tombol utama hover** (`0 5px 12px #2f39a91d`): respons pointer presisi.
- **Pilihan dunia** (`0 5px 20px #34457008`): HUD informasi.
- **Dialog** (`0 22px 80px #24356830`): panduan modal.
- **Objek seret** (`drop-shadow(0 12px 8px #2f39a925)`): objek yang diangkat pengguna.

## Shapes

Bentuk umum adalah sudut membulat ringan: field, tombol, HUD, navigasi, dan panel memakai radius berbeda sesuai ukuran yang tercatat dalam frontmatter. Batas 1px memisahkan bidang yang berdekatan; tidak ada outline tebal sebagai dekorasi umum. Badge kecil memakai radius 4px, sedangkan penanda status berbentuk lingkaran.

Signature dunia berupa balok SVG tiga sisi dan lantai belah ketupat. Ikon garis digambar khusus, umumnya 19px dengan stroke 1.7 dan ujung membulat; ikon tindakan kecil memakai 12–16px. Ikon mendampingi kata atau memiliki nama aksesibel.

## Components

### Buttons

Tombol terasa ringkas dan tegas.

- **Primary:** indigo dengan teks putih, radius token `button`, padding token komponen, tinggi minimum 40px, dan bobot 500. Biasanya memenuhi lebar field.
- **Secondary:** putih, teks indigo, border silver, tinggi minimum 36px; pada ponsel minimum 40px. Hover menggunakan indigo pucat.
- **Text:** tanpa permukaan terpisah, untuk reset dan penghapusan catatan.
- **Focus:** outline biru 3px dengan offset 4px.
- **Active / disabled:** skala tekan .97 untuk tombol aktif; disabled memakai opacity .45 dan cursor yang jelas.
- **Motion:** transisi warna 160ms dan transform 140ms dengan easing `--ease`; hover hanya pada pointer presisi. Mode keyboard menonaktifkan transisi tombol dan transform tekan.

### Chips

Badge misi memakai indigo pucat dan teks indigo. Status selesai memakai permukaan hijau pucat dan teks keberhasilan gelap. Langkah misi menggunakan label serta ikon; status saat ini dan selesai memiliki perlakuan tersendiri. Jangan mengandalkan warna sebagai satu-satunya pembeda.

### Cards / Containers

Arena dan panel operator memakai putih, radius token `panel`, border silver, dan bayangan ambient. Subbagian dipisahkan garis dan perubahan nada ringan. Area struktur memakai permukaan hampir putih; panel jejak Python memakai silver berwarna indigo lembut. Padding bagian utama umumnya 20px.

### Inputs / Fields

Field native memiliki label permanen, permukaan terang, border silver, radius token `field`, dan padding komponen. Fokus menggeser border menjadi indigo dengan bayangan lembut `0 0 0 3px #2f39a90b`; outline keyboard tetap ada. Mobile memakai font 16px dan tinggi 40px. Pesan gagal muncul melalui umpan balik yang memiliki teks, simbol, dan status live; dokumentasi tidak mengklaim error border per-field yang belum ada.

### Navigation

Rail menyediakan Stack, Queue, dan Panduan dengan ikon serta label. Pilihan rail memakai indigo pucat; pemilih ruang atas memakai permukaan indigo penuh untuk tombol aktif. `aria-pressed` menyatakan pilihan ruang. Pada layout lebih kecil pemilih ruang atas menjadi satu baris penuh; rail tetap tersedia dengan ukuran yang mengecil.

### Isometric arena and camera

Objek dan jalur dapat dipilih melalui pointer atau Tab lalu Enter / Spasi. Objek Stack teratas dapat diseret; tindakan pindah di panel menawarkan operasi yang sama. Drop target diberi outline turquoise. Kamera memiliki zoom 100–180%, fokus objek, dan reset; pencarian memfokuskan objek. HUD menunjukkan pilihan dan keterangan objek.

Animasi objek menggunakan lintasan terangkat berhingga (560ms pada kecepatan 1×); keluar menggunakan 250ms; kamera memakai 260ms; penanda node masuk memakai 200ms. Kecepatan 0.65×, 1×, atau 1.5× mengubah timing operasi. Easing perpindahan menggunakan `--move`; kamera dan respons singkat memakai `--ease`. Ketika kamera berpindah, animasi perpindahan objek tidak ditumpuk. Banner keberhasilan masuk selama 260ms dan disembunyikan setelah 3500ms.

**The Explain Motion Rule.** Gerak mengikuti tindakan atau perubahan perhatian, selesai dalam satu rangkaian, dan dapat diminimalkan.

### Linked-list and Python trace

Node menampilkan data, bagian next, dan label pointer. Referensi dihubungkan dengan panah; nilai kosong ditulis None. Diagram menunjukkan keadaan akhir yang sama dengan model dunia. Jejak Python memberi langkah dan snapshot teks tersendiri; playback memakai interval 1100ms pada 1× dan berhenti ketika urutan berakhir. Tidak ada klaim bahwa model dijalankan ulang oleh interpreter Python.

Pilihan node menggunakan batas cyan dan permukaan cyan pucat. Baris kode aktif memiliki permukaan indigo pucat serta garis kiri indigo. Tombol sebelum / berikut / putar dan kontrol details memungkinkan inspeksi manual.

**The Linked Truth Rule.** Diagram dan label mempertahankan arah top, front, rear, dan next yang benar; gerak visual tidak mengubah arti referensi.

### Reduced motion and feedback

Preferensi perangkat dan pilihan Gerakan minimal meniadakan animasi operasi serta transisi utama. Animasi dihentikan ketika halaman tersembunyi. Feedback dan banner misi memakai status live yang sopan; keyboard memiliki alternatif lengkap untuk tindakan seret.

## Do's and Don'ts

### Do:

- **Do** pertahankan dasar putih–silver dan empat warna aksen yang ditetapkan pengguna.
- **Do** gunakan indigo untuk tindakan, turquoise untuk penanda pilihan, dan label untuk menjelaskan status.
- **Do** hubungkan objek dunia, node, dan snapshot kode melalui identitas data yang sama.
- **Do** sediakan tombol serta keyboard untuk tindakan langsung dan hormati gerakan minimal.
- **Do** tempatkan operasi cepat dekat arena pada layar sempit dan biarkan form lengkap berada di kontrol operator.
- **Do** gunakan SVG yang digambar khusus dan font lokal untuk menjaga bentuk dunia.

### Don't:

- **Don't** mengganti dasar putih–silver dengan permukaan gelap sebagai identitas utama.
- **Don't** memakai gerak berulang sebagai dekorasi arena.
- **Don't** mengubah arah panah linked-list demi komposisi dunia.
- **Don't** menggunakan turquoise terang untuk teks informasi utama tanpa pasangan teks gelap.
- **Don't** menggambarkan jejak Python sebagai interpreter atau animasi langkah model yang belum tersedia.

