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
  goal: "#b9730f"
  goal-ink: "#8a5a0b"
  goal-pale: "#fbf1e0"
  structure-line: "#2f8aa0"
  select-line: "#0e9e82"
typography:
  headline:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-.9px"
  section:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "22px"
    fontWeight: 500
  title:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1.5
  lead:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "13px"
  meta:
    fontFamily: "Ubuntu, 'Segoe UI', sans-serif"
    fontSize: "12px"
  code:
    fontFamily: "Consolas, monospace"
    fontSize: "13px"
    lineHeight: 2.15
rounded:
  control: "6px"
  hud: "10px"
  card: "16px"
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
    rounded: "{rounded.control}"
    padding: "11px 10px"
  button-primary-hover:
    backgroundColor: "{colors.indigo-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.indigo}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  button-secondary-hover:
    backgroundColor: "{colors.pale}"
  input-field:
    backgroundColor: "#fafbfe"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 10px"
    height: "44px"
  room-navigation:
    backgroundColor: "#f7f8fb"
    textColor: "{colors.muted}"
    rounded: "{rounded.hud}"
    padding: "4px"
  room-navigation-active:
    backgroundColor: "{colors.indigo}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    padding: "10px 19px"
  mission-chip:
    backgroundColor: "{colors.pale}"
    textColor: "{colors.indigo}"
    rounded: "{rounded.control}"
    padding: "3px 7px"
  panel:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.card}"
  linked-node:
    backgroundColor: "#f0f2fc"
    textColor: "{colors.indigo}"
    rounded: "{rounded.control}"
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
- **Cyan Jalur** (`cyan`): sisi arena dan detail struktural. Batas pilihan memakai `select-line`.
- **Garis Struktur** (`structure-line`): batas jalur dan elemen struktural; warna triase Non-darurat.

### Tertiary

- **Turquoise Aksi** (`teal`): isi pilihan dan area drop. Target misi berpindah ke amber; outline pilihan memakai `select-line`.
- **Hijau Teks Keberhasilan** (`teal-ink`): teks penyelesaian dan langkah yang selesai. Turquoise terang berfungsi sebagai penanda visual; teks keberhasilan menggunakan pasangan gelap ini.
- **Amber Target** (`goal`): target misi, bintang, dan nilai baru di Baki hasil. Amber juga warna triase Darurat.
- **Amber Teks** (`goal-ink`): teks Baki hasil dan label target di atas latar terang.
- **Amber Pucat** (`goal-pale`): token cadangan untuk latar amber; belum dipakai komponen.
- **Garis Pilihan** (`select-line`): outline pilihan dan drop target; kontras 3,37:1 pada putih.
- **Merah Peringatan** (`danger`): tindakan pembatalan, penanda bahaya, dan triase Kritis; bukan aksen dekoratif.

### Neutral

- **Silver Halaman** (`paper`): latar halaman.
- **Putih Panel** (`white`): kontrol, navigasi, panel utama, dan label dunia.
- **Tinta Dingin** (`ink`): teks utama.
- **Abu Informasi** (`muted`): keterangan dan label pendamping.
- **Indigo Pucat** (`pale`): pilihan, tombol pendamping, dan badge misi.
- **Garis Silver** (`line`): pemisah, batas panel, dan kontrol.

**The Light Arena Rule.** Pertahankan dasar putih–silver dan gunakan warna aksen untuk objek, tindakan, pilihan, serta referensi.

**Warna menandai keadaan, bukan identitas.** Semua kotak Stack memakai satu nada netral. Warna dipakai untuk status: terpilih (turquoise), target dan bintang (amber), serta gagal (merah). Triase pasien: Kritis merah (`danger`), Darurat amber (`goal`), Non-darurat `structure-line`.

## Typography

**Display / Body Font:** Ubuntu lokal, dengan Segoe UI dan sans-serif sebagai fallback. File Regular dan Medium dimuat dari aset proyek.

**Label / Mono Font:** Ubuntu untuk label antarmuka; Consolas dengan fallback monospace untuk kode, pointer, dan hitungan tertentu.

**Character:** Huruf humanis yang ringkas membuat dunia teknis terasa ramah. Monospace menandai informasi referensi tanpa mengubah seluruh antarmuka menjadi terminal.

### Hierarchy

- **Headline:** 28px (`--t-display`), Ubuntu Medium. Judul section 22px (`--t-section`).
- **Title:** 18px (`--t-title`) untuk panel dan misi; 16px (`--t-lead`) untuk penekanan.
- **Body:** 15px (`--t-body`) dengan line-height 1.5 sampai 1.8 untuk penjelasan.
- **Label:** 13px (`--t-label`) untuk field dan kontrol; 12px (`--t-meta`) untuk metadata, badge, label SVG, dan petunjuk ringkas. Teks informasi tidak memakai turquoise terang.
- **Code:** 13px (`--t-code`). Nomor baris memakai tinta gelap; teks next memakai biru operator agar kontras di permukaan pucat cukup.

Skala tujuh langkah: 12, 13, 15, 16, 18, 22, dan 28px. Minimum 12px untuk semua teks, termasuk teks SVG. Angka jam, kapasitas, dan laporan memakai angka tabular. Hanya Ubuntu 400 dan 500 yang dimuat; `strong` memakai 500, bukan bold sintetis. Font lokal dipertahankan.

## Layout

Topbar setinggi 56px memuat wordmark, tab ruang, progres level, dan prinsip LIFO/FIFO. Di atas 540px tidak ada rail samping; ruang dipilih dari topbar. Pada ponsel, prinsip LIFO/FIFO tetap terlihat sebagai chip ringkas.

Urutan belajar di desktop: tujuan misi, stage arena, Lensa di kolom kanan, lalu Bedah Eksekusi. Stage memakai tinggi `clamp(420px, 100vh - 256px, 720px)` sehingga arena dan dock aksi (`#quick-actions`) terlihat dalam satu layar. Dock berada di dalam stage pada bagian bawah. Lensa (`.inspector.lens`) memuat struktur, kode, dan kontrol lanjutan; lebarnya 380px dan turun menjadi satu kolom pada 1050px atau kurang.

Pengukuran 1440×900: arena dimulai pada Y=253, dock pada Y=820, dan kode di Lensa pada Y=691. Pengukuran 390×844: arena dimulai pada Y=289, dan teks SVG terkecil 12px.

Pada 540px atau kurang, navigasi menjadi bilah bawah 68px ditambah safe area. Shell memakai lebar penuh dan menyisakan ruang bawah untuk navigasi. Inset halaman 16px; field 16px dengan tinggi 44px. Pada ponsel, baris metadata rak di SVG disembunyikan (`compact-labels`); jumlah tetap tampil di HUD dan Lensa. Diagram node dan kode bergulir di dalam panelnya tanpa memperlebar halaman.

Kontrol kamera dan tombol operasi minimum 44px. Lantai arena mengizinkan gulir vertikal (`pan-y`); hanya kotak teratas yang dapat diseret memakai `touch-action: none`.

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

Bentuk umum adalah sudut membulat ringan. Radius yang dipakai hanya token `control` (6px) untuk field, tombol, dan badge; `hud` (10px) untuk navigasi dan HUD; `card` (16px) untuk panel; serta 0 dan 50% untuk kasus khusus. Batas 1px memisahkan bidang yang berdekatan; tidak ada outline tebal sebagai dekorasi umum. Penanda status berbentuk lingkaran.

Signature dunia berupa balok SVG tiga sisi dan lantai belah ketupat. Ikon garis digambar khusus, umumnya 19px dengan stroke 1.7 dan ujung membulat; ikon tindakan kecil memakai 12–16px. Ikon mendampingi kata atau memiliki nama aksesibel.

## Components

### Buttons

Tombol terasa ringkas dan tegas.

- **Primary:** indigo dengan teks putih, radius token `control`, padding token komponen, tinggi minimum 44px, dan bobot 500. Biasanya memenuhi lebar field.
- **Secondary:** putih, teks indigo, border silver, tinggi minimum 44px. Hover menggunakan indigo pucat.
- **Text:** tanpa permukaan terpisah, untuk reset dan penghapusan catatan.
- **Focus:** outline biru 3px dengan offset 4px.
- **Active / disabled:** skala tekan .97 untuk tombol aktif; disabled memakai opacity .45 dan cursor yang jelas.
- **Motion:** transisi warna 160ms dan transform 140ms dengan easing `--ease`; hover hanya pada pointer presisi. Mode keyboard menonaktifkan transisi tombol dan transform tekan.

### Chips

Badge misi memakai indigo pucat dan teks indigo. Status selesai memakai permukaan hijau pucat dan teks keberhasilan gelap. Langkah misi menggunakan label serta ikon; status saat ini dan selesai memiliki perlakuan tersendiri. Jangan mengandalkan warna sebagai satu-satunya pembeda.

### Cards / Containers

Arena dan panel operator memakai putih, radius token `card`, border silver, dan bayangan ambient. Subbagian dipisahkan garis dan perubahan nada ringan. Area struktur memakai permukaan hampir putih; panel jejak Python memakai silver berwarna indigo lembut. Padding bagian utama umumnya 20px.

### Inputs / Fields

Field native memiliki label permanen, permukaan terang, border silver, radius token `control`, dan padding komponen. Fokus menggeser border menjadi indigo dengan bayangan lembut `0 0 0 3px #2f39a90b`; outline keyboard tetap ada. Mobile memakai font 16px dan tinggi 44px. Pesan gagal muncul melalui umpan balik yang memiliki teks, simbol, dan status live; dokumentasi tidak mengklaim error border per-field yang belum ada.

### Navigation

Navigasi ruang berada di topbar sebagai `room-switch` dengan `aria-pressed`; ruang aktif memakai indigo penuh. Di atas 540px tidak ada rail samping. Pada ponsel, bilah bawah 68px memuat Stack, Queue, dan Panduan dengan ikon serta label.

### Isometric arena and camera

Objek dan jalur dapat dipilih melalui pointer atau Tab lalu Enter / Spasi. Objek Stack teratas dapat diseret; tindakan pindah di panel menawarkan operasi yang sama. Drop target diberi outline turquoise. Kamera memiliki zoom 100–180%, fokus objek, dan reset; pencarian memfokuskan objek. HUD menunjukkan pilihan dan keterangan objek.

Animasi objek menggunakan lintasan terangkat berhingga (560ms pada kecepatan 1×); keluar menggunakan 250ms; kamera memakai 260ms; penanda node masuk memakai 200ms. Kecepatan 0.65×, 1×, atau 1.5× mengubah timing operasi. Easing perpindahan menggunakan `--move`; kamera dan respons singkat memakai `--ease`. Ketika kamera berpindah, animasi perpindahan objek tidak ditumpuk. Banner keberhasilan masuk selama 260ms dan disembunyikan setelah 3500ms.

**The Explain Motion Rule.** Gerak mengikuti tindakan atau perubahan perhatian, selesai dalam satu rangkaian, dan dapat diminimalkan.

Baki hasil (`#result-tray`) menampilkan nilai kembali dari pop, peek, dequeue, dan isEmpty, termasuk `None`. Kotak yang di-pop melengkung ke baki lalu memudar; baki diberi outline amber selama 600ms ketika nilai baru masuk. Pada gerakan minimal, objek yang berubah tetap diberi outline statis tanpa translasi.

### Linked-list and Python trace

Node menampilkan data, bagian next, dan label pointer. Diagram utama menunjukkan keadaan akhir yang sama dengan arena. Bedah Eksekusi menampilkan cuplikan Python dari dokumen, baris aktif, cabang tidak dijalankan, serta rekaman referensi dan variabel lokal dari instruksi model JavaScript. Baris dapat dipilih dengan klik atau keyboard. Kontrol playback minimal 44px memakai interval 1100ms dibagi kecepatan gerak dan berhenti di akhir. Objek arena yang direferensikan baris aktif diberi sorot `trace-focus`. Snapshot tidak memutasi arena. Rekaman empat operasi dasar dibedakan dari penjelasan algoritma operasi lainnya. Sumber dokumen dan nomor baris relatif cuplikan selalu dijelaskan. Implementasi JavaScript aktual dan definisi awal Node/Stack/Queue tersedia dalam disclosure.

Kartu memori menampilkan identitas node lokal N1/N2, data, serta target next secara eksplisit; posisi kartu tidak menyatakan urutan linked-list. Perubahan referensi memakai permukaan turquoise pucat dan teks sebelum→sesudah. Node terlepas bergaris putus-putus; identitas ini bukan alamat RAM dan tidak merepresentasikan garbage collector. Python tidak dijalankan oleh browser. Pencatatan node menambah O(n) per langkah, terpisah dari biaya operasi pointer inti O(1).

Pilihan node menggunakan batas cyan dan permukaan cyan pucat. Baris kode aktif memiliki permukaan indigo pucat serta garis kiri indigo. Tombol sebelum / berikut / putar dan kontrol details memungkinkan inspeksi manual.

**The Linked Truth Rule.** Diagram dan label mempertahankan arah top, front, rear, dan next yang benar; gerak visual tidak mengubah arti referensi.

### Reduced motion and feedback

Preferensi perangkat dan pilihan Gerakan minimal meniadakan translasi dan transisi utama, tetapi tidak menghapus penjelasan: perubahan tetap ditandai outline statis (`.changed`, `.result-tray.fresh`). Mode keyboard tetap menjalankan gerak arena; hanya transisi tombol yang dimatikan. Animasi dihentikan ketika halaman tersembunyi. Feedback dan banner misi memakai status live yang sopan; keyboard memiliki alternatif lengkap untuk tindakan seret.

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


## Kurasi pengalaman belajar · 15 Oktober 2026

Misi, reset, dan pergantian mode meminta konfirmasi jika eksperimen atau isian sudah berubah. Escape dan tombol kembali mempertahankan data. Prediksi membaca top/front saat ini; jawaban salah dapat dicoba lagi dan tidak membuka jawaban langsung. Hint Stack mengikuti lokasi penghalang, termasuk Rak B; jika barang yang diperlukan sudah keluar, hint meminta mengulang skenario. Penyelesaian misi menjelaskan hasil yang teramati tanpa mengklaim penguasaan materi.

Tujuan transfer disimpan selama valid untuk rak sumber. Draft kapasitas disimpan per rak; penambahan barang hanya membersihkan isian formulir barang. Pilihan rak, mode, objek dan jalur memiliki aria-pressed; semua tombol SVG memiliki indikator fokus. Perubahan preferensi reduced motion saat aplikasi terbuka membatalkan animasi yang sedang berjalan.

Level 1–6 per ruang (Stack: tumpuk, kosongkan, ambil B, balik urutan, batas kapasitas, rencana; Queue: antre, kosongkan, batal di tengah, jam loket, prioritas, rencana pelayanan) memberi bintang sesuai langkah dan petunjuk yang dipakai. Petunjuk bertingkat, prediksi di strip misi, dan pertanyaan setelah level mendukung fase Explain.

Lihat AUDIT-UIUX.md untuk temuan, bukti verifikasi, serta batas pengujian.

## Tantangan pemula

Subbagian opsional ditempatkan antara judul ruang dan workspace. Awalnya hanya judul, penjelasan ringkas, progres 0/10, dan tombol Mulai latihan yang terlihat. Saat dibuka, nomor soal, pertanyaan, tombol jawaban, dan diagram data latihan tampil dalam dua kolom; di bawah 700px menjadi satu kolom. Setiap ruang memiliki 10 soal dari operasi dasar hingga kondisi kosong dan operasi berurutan. Satu penanda Soal N dari 10 menggantikan daftar langkah agar antarmuka tetap ringkas. Setiap soal memuat skenario tersendiri. Diagram kosong menampilkan None; Queue satu node menandai front / rear pada node yang sama.

Teks utama 14px, metadata 13px, kontrol minimum 44px. Permukaan dan warna memakai token yang sama dengan arena. Jawaban salah memberi petunjuk dan dapat dicoba kembali; jawaban benar memperbarui diagram melalui model Stack/Queue yang sudah ada. Feedback memiliki status live dan dapat menerima fokus; Tab berikutnya menuju pilihan atau langkah lanjutan. Latihan tidak menambah animasi, penalti, penghitung waktu, ataupun klaim penguasaan materi. Data terpisah dari arena dijelaskan sebelum pengguna mulai.
