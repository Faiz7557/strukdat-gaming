# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mahasiswa yang mempelajari materi dan tugas Praktikum 6 Stack serta Praktikum 7 Queue.

## Product Purpose

Simulasi interaktif isometrik yang menghubungkan operasi barang/pasien, node linked-list, dan jejak Python. Pengguna dapat mencoba 10 soal pemula per ruang, bereksperimen, dan menyelesaikan enam level per ruang yang memuat dua misi praktikum. Queue Live menambahkan 20 soal kompetitif bersama kelas: host memandu ronde serentak, peserta bergabung dengan kode, server menentukan skor dan bonus kecepatan, lalu kelas melihat pembahasan dan leaderboard.

## Operating Context

Materi sumber adalah PRAKTIKUM 6 Stack.docx dan PRAKTIKUM 7 Queue.docx di direktori induk. Antarmuka berbahasa Indonesia. Aplikasi berjalan melalui server HTTP lokal berbasis Node dan memakai HTML, CSS, serta JavaScript standar.

## Capabilities and Constraints

Stack memiliki tiga rak, batas berat/jumlah, pencarian, push/pop/peek/isEmpty, dan Stack bantuan. Queue dibuka di FIFO dasar; tiga prioritas tersedia sebagai mode lanjutan, pembatalan pasien menunggu, satu loket dengan pelayanan lima menit, jam manual, estimasi tunggu, dan laporan. Bedah Eksekusi menghubungkan empat operasi dasar dengan cuplikan Python dari dokumen dan rekaman node/referensi yang diambil saat instruksi model JavaScript berjalan. Python bukan interpreter. Rekaman dapat ditelusuri tanpa mengubah arena. Penjelasan algoritma untuk operasi lainnya diberi label berbeda. Data dan progres level berada di memori tab. Enam level per ruang memberi 1–3 bintang terhadap par langkah.

Queue Live memakai server Node standar, POST JSON dan SSE terautentikasi, tanpa paket tambahan. Ruang dibatasi 60 peserta, disimpan di RAM selama maksimal tiga jam, dan memerlukan server yang sama untuk semua perangkat. Perangkat LAN membutuhkan binding --lan; hosting statis tidak menyediakan multiplayer. CSV hasil hanya untuk host; identitas sesi bukan akun terverifikasi. Koneksi putus tidak menghentikan timer. Kuis dibuka di tab baru untuk mempertahankan arena.

## Brand Commitments

Nama yang diminta pengguna: Strukdat Gaming. Desain modern, clean, agak futuristik. Dasar putih–silver. Warna aksen dari gambar referensi pengguna: #2F39A9, #2E6FA0, #49A4BB, #15D8B3.

## Evidence on Hand

Kedua dokumen praktikum sudah dibaca; implementasi dan tes model berada di model.js dan tests/model.test.js. Tidak ada bukti hasil evaluasi belajar yang boleh diklaim.

## Product Principles

- Hubungkan tindakan fisik dengan perubahan referensi.
- Pertahankan LIFO, FIFO per tingkat, dan penanganan kondisi kosong.
- Perpindahan yang gagal tidak mengubah isi rak sumber.
- Interaksi langsung memiliki alternatif tombol dan keyboard; gerakan dapat dikurangi.

Tantangan pemula memakai objek Stack/Queue tersendiri dengan 10 soal per ruang (20 total). Materi mencakup tambah, ambil, peek, isEmpty pada struktur berisi/kosong, node terakhir, underflow, operasi campuran, perubahan referensi, dan dua kali pengambilan. Setiap soal memiliki skenario awal sendiri; jawaban salah tidak memutasi data, sedangkan jawaban benar menjalankan model asli. Latihan Queue hanya memakai FIFO dasar. Progres per ruang berada di memori tab dan tidak memutasi arena, misi, atau rekaman eksekusi utama.
