# Strukdat Gaming

Web praktikum isometrik 2.5D berbahasa Indonesia untuk **PRAKTIKUM 6 Stack.docx** dan **PRAKTIKUM 7 Queue.docx**. HTML, CSS, dan JavaScript standar; tidak memerlukan instalasi paket atau koneksi internet.

## Membuka aplikasi

Dari folder ini, jalankan:

```powershell
node serve.js
```

Buka http://127.0.0.1:5174. Server memakai Node.js standar dan hanya menyediakan berkas aplikasi. Aplikasi memakai ES modules sehingga perlu dibuka melalui server HTTP lokal.

## Isi simulasi

- Gudang: tiga Stack linked-list, push, pop, peek, isEmpty, pencarian ID, batas jumlah/berat, dan perpindahan barang yang memvalidasi tujuan sebelum mengubah sumber.
- Misi Stack: ambil B, simpan D dan C pada Stack bantuan, pulihkan A–C–D.
- Queue: FIFO dasar atau tiga jalur prioritas. Satu loket, lima menit per pasien, pelayanan tidak diinterupsi. Pemanggilan dilakukan manual setelah loket tersedia.
- Pembatalan pasien menunggu menggunakan pencarian dan penyambungan ulang linked-list, termasuk perubahan front/rear.
- Jam simulasi, estimasi tunggu berdasarkan antrean saat ini, laporan dilayani/dibatalkan/menunggu, dan pasien dalam pelayanan ditampilkan terpisah.
- Misi Queue: daftarkan P04 kritis, selesaikan P04, panggil P02 sebelum P03, batalkan P01.
- Diagram linked-list dan jejak Python dengan kontrol langkah, putar, dan jeda. Diagram utama menampilkan keadaan akhir operasi. Snapshot teks pada jejak menunjukkan referensi pada setiap langkah.
- Drag barang teratas antarrak, dengan pemeriksaan kapasitas sebelum sumber diubah dan alternatif tombol/keyboard.
- Kamera zoom 100–180%, fokus objek, dan pengaturan kecepatan gerakan serta jejak Python.
- Animasi angkat–pindah–turun, pasien menuju loket, dan umpan balik penyelesaian misi.
- Draft formulir tetap tersimpan saat memilih rak/pasien. Operasi cepat diletakkan dekat arena pada ponsel.
- Navigasi keyboard, dialog panduan, tampilan responsif, dan reduced motion. Gerakan dihentikan saat tab tersembunyi.

## Verifikasi

```powershell
node --test tests/model.test.js
```

Tes model memeriksa LIFO/FIFO, kondisi kosong, kapasitas dan perpindahan gagal, pemulihan Stack bantuan, pembatalan node, prioritas, pelayanan tanpa interupsi, estimasi tunggu, validasi, dan konsistensi laporan.

Tes browser tersimpan di `tests/browser.cjs`. Dengan server aktif dan Playwright yang sudah tersedia, jalankan `node tests/browser.cjs`. Bila paket tidak berada pada jalur modul standar, isi variabel lingkungan `PLAYWRIGHT_MODULE` dengan lokasi paket; `BROWSER_EXECUTABLE` dapat menunjuk Chromium yang sudah terpasang. Tes ini menghasilkan screenshot desktop dan ponsel di `screenshots/`, serta memeriksa drag mouse, emulasi sentuhan dan pembatalannya, kegagalan kapasitas, kamera, draft formulir, penyelesaian misi, dan reduced motion. Emulasi ini bukan pengujian perangkat ponsel fisik.

## Batas versi ini

Data hanya berada di memori tab dan kembali ke contoh ketika halaman dimuat ulang. Mode dan misi baru mengganti skenario ruang tersebut. Python ditampilkan untuk pembelajaran, bukan interpreter kode pengguna. Jam dimajukan manual; kedatangan pasien melalui registrasi. Dunia isometrik menampilkan enam kotak teratas per rak dan lima pasien depan per jalur, dengan indikator jumlah yang tersisa; diagram node dan panel kontrol tetap mencakup seluruh data. Antrean klinik merupakan penyederhanaan tugas praktikum, bukan model pengambilan keputusan medis.

## Desain

Dasar putih–silver (#FFFFFF / #F4F5F9), indigo #2F39A9, biru #2E6FA0, cyan #49A4BB, turquoise #15D8B3. Ubuntu Regular/Medium disertakan secara lokal (lisensi di assets/UFL.txt); Consolas untuk kode dan referensi. SVG dunia dan diagram node berasal dari state linked-list yang sama. Animasi terbatas pada tindakan pengguna dan tidak memakai loop dekoratif. DESIGN.md dan .impeccable/design.json mencatat token dan pola antarmuka.
