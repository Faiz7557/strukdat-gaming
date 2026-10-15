# Strukdat Gaming

Web praktikum isometrik 2.5D berbahasa Indonesia untuk **PRAKTIKUM 6 Stack.docx** dan **PRAKTIKUM 7 Queue.docx**. HTML, CSS, dan JavaScript standar; tidak memerlukan instalasi paket atau koneksi internet.

Untuk langkah penggunaan, contoh penyelesaian kedua misi, dan bantuan kendala umum, baca [Panduan Pengguna](PANDUAN-PENGGUNA.md).

## Membuka aplikasi

Dari folder ini, jalankan:

```powershell
node serve.js
```

Buka http://127.0.0.1:5174. Server memakai Node.js standar dan hanya menyediakan berkas aplikasi. Aplikasi memakai ES modules sehingga perlu dibuka melalui server HTTP lokal.

## Isi simulasi

- Tantangan pemula: 20 soal (10 Stack dan 10 Queue) tentang tambah/ambil/peek, isEmpty, kondisi kosong, underflow, perubahan referensi, serta urutan beberapa operasi. Umpan balik dan diagram langsung, retry tanpa penalti, dan progres per ruang selama tab terbuka.

- Gudang: tiga Stack linked-list, push, pop, peek, isEmpty, pencarian ID, batas jumlah/berat, dan perpindahan barang yang memvalidasi tujuan sebelum mengubah sumber.
- Misi Stack: ambil B, simpan D dan C pada Stack bantuan, pulihkan A–C–D.
- Queue: FIFO dasar atau tiga jalur prioritas. Satu loket, lima menit per pasien, pelayanan tidak diinterupsi. Pemanggilan dilakukan manual setelah loket tersedia.
- Pembatalan pasien menunggu menggunakan pencarian dan penyambungan ulang linked-list, termasuk perubahan front/rear.
- Jam simulasi, estimasi tunggu berdasarkan antrean saat ini, laporan dilayani/dibatalkan/menunggu, dan pasien dalam pelayanan ditampilkan terpisah.
- Misi Queue: daftarkan P04 kritis, selesaikan P04, panggil P02 sebelum P03, batalkan P01.
- Bedah Eksekusi: cuplikan push/pop/enqueue/dequeue dari dokumen praktikum, baris aktif yang bisa dipilih, cabang yang dilewati, serta kontrol langkah/putar/jeda. Node, referensi, variabel lokal, dan hasil direkam langsung saat instruksi model JavaScript berjalan. Arena tetap menampilkan hasil akhir; penelusuran rekaman tidak mengubah data.
- Sumber dokumen/bagian, hubungan kotak/pasien dengan Node.data, kode awal Node/Stack/Queue, dan implementasi JavaScript aktual tersedia pada panel pembelajaran. Aturan kapasitas, prioritas, dan pelayanan dibedakan dari algoritma dasar.
- Transfer memperlihatkan dua fase: push ke tujuan setelah validasi, lalu pop dari sumber. Identitas N1/N2 lokal pada setiap rekaman; node yang tidak lagi dicapai tetap ditampilkan untuk penjelasan, tanpa mengklaim perilaku garbage collector.
- Drag barang teratas antarrak, dengan pemeriksaan kapasitas sebelum sumber diubah dan alternatif tombol/keyboard.
- Kamera zoom 100–180%, fokus objek, dan pengaturan kecepatan gerakan serta jejak Python.
- Animasi angkat–pindah–turun, pasien menuju loket, dan umpan balik penyelesaian misi.
- Draft formulir tetap tersimpan saat memilih rak/pasien. Operasi cepat diletakkan dekat arena pada ponsel.
- Navigasi keyboard, dialog panduan, tampilan responsif, dan reduced motion. Gerakan dihentikan saat tab tersembunyi.

## Verifikasi

```powershell
npm test
```

Tes model memeriksa LIFO/FIFO, kondisi kosong, kapasitas dan perpindahan gagal, pemulihan Stack bantuan, pembatalan node, prioritas, pelayanan tanpa interupsi, estimasi tunggu, validasi, dan konsistensi laporan. Tes tambahan memeriksa keadaan node per instruksi, cabang yang dijalankan, snapshot yang tidak berubah, dan kesesuaian rekaman akhir dengan model. Tes view memakai DOM sink di Node untuk memeriksa wiring formulir/tombol, pemilihan baris, escaping, fase transfer, reset, serta replay yang tidak memutasi arena; ini bukan pengujian layout browser.

Dengan Python dan kedua DOCX di folder induk, jalankan `python tests/practicum-parity.py`. Tes ini memastikan empat cuplikan masih cocok dengan dokumen sumber, menjalankan cuplikan Python tersebut, dan membandingkan 12 keadaan/hasil dengan model JavaScript, termasuk kondisi kosong. Python hanya diperlukan untuk tes ini.

Tes browser tersimpan di `tests/browser.cjs`. Dengan server aktif dan Playwright yang sudah tersedia, jalankan `node tests/browser.cjs`. Bila paket tidak berada pada jalur modul standar, isi variabel lingkungan `PLAYWRIGHT_MODULE` dengan lokasi paket; `BROWSER_EXECUTABLE` dapat menunjuk Chromium yang sudah terpasang. Tes ini menghasilkan screenshot desktop dan ponsel di `screenshots/`, serta memeriksa drag mouse, emulasi sentuhan dan pembatalannya, kegagalan kapasitas, kamera, draft formulir, penyelesaian misi, dan reduced motion. Emulasi ini bukan pengujian perangkat ponsel fisik.

## Batas versi ini

Data hanya berada di memori tab dan kembali ke contoh ketika halaman dimuat ulang. Mode dan misi baru mengganti skenario ruang tersebut. Python ditampilkan untuk pembelajaran, bukan interpreter kode pengguna. Rekaman instruksi tersedia untuk empat operasi dasar; peek/isEmpty dan pembatalan masih berupa penjelasan algoritma yang diberi label berbeda. Cuplikan dokumen menghilangkan baris kosong; nomor baris relatif terhadap cuplikan, bukan nomor halaman dokumen. Operasi pointer inti O(1), sedangkan pencatatan seluruh node menambah O(n) per langkah untuk pembelajaran. JS juga mengembalikan data dari push/enqueue sebagai kemudahan aplikasi, berbeda dari return implisit None pada Python; tes kesetaraan memeriksa isi struktur dan hasil pop/dequeue. Jam dimajukan manual; kedatangan pasien melalui registrasi. Dunia isometrik menampilkan enam kotak teratas per rak dan lima pasien depan per jalur, dengan indikator jumlah yang tersisa; diagram node dan panel kontrol tetap mencakup seluruh data. Antrean klinik merupakan penyederhanaan tugas praktikum, bukan model pengambilan keputusan medis.

## Desain

Dasar putih–silver (#FFFFFF / #F4F5F9), indigo #2F39A9, biru #2E6FA0, cyan #49A4BB, turquoise #15D8B3. Ubuntu Regular/Medium disertakan secara lokal (lisensi di assets/UFL.txt); Consolas untuk kode dan referensi. SVG dunia dan diagram node berasal dari state linked-list yang sama. Animasi terbatas pada tindakan pengguna dan tidak memakai loop dekoratif. DESIGN.md dan .impeccable/design.json mencatat token dan pola antarmuka.

## Audit dan kurasi UI/UX

Tujuan misi tampil sebelum arena; hasil operasi dan tautan rekaman berada setelah tombol aksi. Ponsel memakai navigasi bawah dan prinsip LIFO/FIFO tetap terlihat. Teks edukasi 14px, metadata minimum 12px, serta tombol utama dan kamera minimum 44px. Penggantian skenario meminta konfirmasi jika eksperimen atau isian sudah berubah.

Tes tambahan `node tests/browser-audit.cjs` memakai Playwright yang sudah terpasang, variabel `PLAYWRIGHT_MODULE` dan `BROWSER_EXECUTABLE` yang sama dengan tes browser utama. Tes ini melayani berkas melalui routing browser sehingga tidak memerlukan server atau koneksi jaringan. Cakupan: dua ruang pada lima lebar layar (320, 390, 768, 1024, 1440px), kedua misi, prediksi dinamis, dialog konfirmasi/Escape, draft per rak, fokus SVG, reduced motion, serta gulir dan drag sentuh sintetis. Bukti berada di `screenshots/audit/`; laporan lengkap di `AUDIT-UIUX.md`.
