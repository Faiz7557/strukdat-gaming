# Strukdat Gaming

Web praktikum isometrik 2.5D berbahasa Indonesia untuk **PRAKTIKUM 6 Stack.docx** dan **PRAKTIKUM 7 Queue.docx**. HTML, CSS, dan JavaScript standar; tidak memerlukan instalasi paket atau koneksi internet.

Untuk langkah penggunaan, contoh penyelesaian kedua misi, dan bantuan kendala umum, baca [Panduan Pengguna](PANDUAN-PENGGUNA.md).

## Membuka aplikasi

Dari folder ini, jalankan:

```powershell
node serve.js
```

Buka http://127.0.0.1:5174. Server memakai Node.js standar untuk berkas aplikasi dan API kuis multipemain. Gunakan Node.js 22 atau lebih baru. Aplikasi memakai ES modules sehingga perlu dibuka melalui server HTTP lokal.

## Queue Live · kuis bersama

Di ruang **Queue**, pilih **Buka kuis bersama**. Kuis terbuka di tab baru sehingga arena tetap tersimpan. Halaman kuis juga tersedia di [quiz.html](http://127.0.0.1:5174/quiz.html).

- Host membuat ruang, memilih durasi 1×/2×/3×, lalu membagikan kode 6 digit atau tautan masuk.
- Peserta memasukkan kode dan nama panggilan sebelum host memulai. Maksimum 60 peserta per ruang, 20 ruang dalam satu proses.
- 20 soal Queue bertahap: FIFO, enqueue/dequeue/peek/isEmpty, kondisi kosong, pointer, penelusuran operasi, pembatalan, prioritas, dan waktu tunggu.
- Ronde dimulai serentak setelah hitung mundur 3 detik. Waktu soal 25–45 detik pada durasi standar. Host melanjutkan sesudah pembahasan; ronde berakhir saat semua menjawab atau waktu habis.
- Jawaban benar mendapat 800 + bonus kecepatan 0–200 poin; salah/tidak menjawab 0. Server mengunci jawaban pertama dan menghitung waktu penerimaan. Skor maksimum 20.000.
- Peringkat berdasarkan skor, jumlah benar, lalu total waktu jawaban benar. Seri penuh berbagi peringkat. Bonus kecepatan dapat mengungguli selisih akurasi; persentase benar ditampilkan terpisah.
- Pembahasan dan distribusi jawaban muncul setiap ronde; hasil akhir memuat podium, leaderboard, ulasan pribadi 20 soal, dan CSV kelas khusus host.
- Refresh tab yang sama memulihkan identitas dan jawaban. Koneksi SSE otomatis dicoba kembali; soal tetap berjalan ketika peserta terputus. Nama dan peringkat terlihat oleh peserta lain, gunakan nama panggilan.

Untuk perangkat berbeda pada jaringan lokal, jalankan:

```powershell
npm run start:lan
```

Buka `http://IP-LAN-KOMPUTER-HOST:5174/quiz.html` di **semua** perangkat, termasuk host, sehingga tautan yang disalin memakai alamat yang bisa diakses peserta. Lihat IP melalui `ipconfig`. Firewall perlu mengizinkan Node/port 5174 pada jaringan privat; Wi-Fi dengan isolasi klien dapat menghalangi koneksi. Alamat `localhost`, `127.0.0.1`, dan `0.0.0.0` bukan alamat untuk dibagikan. Variabel `HOST` dan `PORT` dapat mengganti binding/port.

Ruang berlaku maksimal 3 jam sejak dibuat. Jika `QUIZ_DATA_FILE` diatur, ruang dan hash token disimpan ke satu file JSON; setelah crash atau restart, peserta dan host melanjutkan dengan token yang sama dan waktu mati ikut dihitung. Tanpa file itu, ruang hilang saat restart. Unduh CSV setelah selesai. HTTP LAN tidak mengenkripsi token. Hosting statis saja tidak menjalankan kuis bersama. Belum ada akun, database, atau banyak instance.

### Deploy online (satu instance, HTTP di IP VPS)

| Variabel | Fungsi |
|---|---|
| `QUIZ_HOSTS` | Host header yang diizinkan, persis seperti dikirim browser (IP VPS, atau domain jika nanti ada; tambahkan port jika bukan 80) |
| `QUIZ_TRUST_PROXY=1` | Ambil IP klien dari `X-Forwarded-For`; hanya aktif di belakang proxy |
| `QUIZ_DATA_FILE` | Lokasi snapshot JSON ruang; kosong berarti RAM saja |
| `HOST`, `PORT` | Alamat bind, default `127.0.0.1:5174` |

**Peringatan:** HTTP mengirim token peserta dan kode pemulihan host tanpa enkripsi. Siapa pun di jalur jaringan dapat membacanya dan merebut peran host. Batasi port 80 ke jaringan kelas (lihat langkah firewall di runbook).

#### Runbook Railway (disarankan, HTTPS otomatis)

Railway memberi URL HTTPS sendiri, jadi tidak perlu domain atau sertifikat. Build memakai `Dockerfile`. Jalankan dari folder `data-structure-lab`:

```bash
railway login                     # login di browser Anda
railway init                      # buat project baru
railway up                        # build dan deploy dari folder ini
```

Lalu di dashboard Railway, pada service yang dibuat:

1. **Settings → Networking → Generate Domain**. Catat hostname-nya, misalnya `strukdat-quiz.up.railway.app`.
2. **Variables**, isi:
   - `QUIZ_HOSTS` = hostname dari langkah 1, tanpa `https://`.
   - `QUIZ_TRUST_PROXY` = `1`.
   - `QUIZ_DATA_FILE` = `/data/rooms.json`.
3. **Volumes → New Volume**, mount path `/data`. Snapshot ruang disimpan di sini.
4. Redeploy. Cek `https://HOSTNAME/api/quiz/health` harus `{"ok":true}`.

Catatan: jalankan satu replica saja. Volume hanya bisa dipasang ke satu instance. SSE lewat proxy Railway perlu diuji: buka satu ruang dari dua perangkat dan pastikan update fase muncul tanpa tertahan.

#### Runbook VPS (Docker, HTTP)

Prasyarat: VPS Linux dengan Docker dan plugin compose; port 80 terbuka untuk jaringan kelas.

```bash
cd /opt && git clone https://github.com/Faiz7557/strukdat-gaming.git && cd strukdat-gaming
echo "QUIZ_HOST=$(curl -s ifconfig.me)" > .env      # IP publik VPS; ganti manual jika berbeda
docker compose up -d --build
curl -s "http://$(grep ^QUIZ_HOST= .env | cut -d= -f2)/api/quiz/health"     # harus {"ok":true}
```

Batasi akses ke jaringan kelas (ganti `203.0.113.0/24` dengan rentang IP kelas atau VPN):

```bash
sudo ufw allow from 203.0.113.0/24 to any port 80 proto tcp
sudo ufw deny 80/tcp
sudo ufw allow OpenSSH && sudo ufw --force enable
```

Data ruang disimpan di volume `quiz-data`. Peserta membuka `http://IP-VPS/quiz.html`.

Untuk HTTPS nanti (dengan domain): pakai `deploy/nginx.conf.template`, pasang `certbot certonly --standalone`, dan ubah volume proxy di `docker-compose.yml`.

> Repositori GitHub belum berisi file Queue Live (berkas masih untracked). Commit dan push dulu sebelum langkah `git clone`.

Tanpa Docker, jalankan `serve.js` dengan `QUIZ_HOSTS=IP-VPS QUIZ_TRUST_PROXY=1 QUIZ_DATA_FILE=/var/lib/quiz/rooms.json npm start` dan arahkan proxy ke `127.0.0.1:5174`.

Sebelum sesi, cek `http://IP-VPS/api/quiz/health` mengembalikan `{"ok":true}`, lalu uji satu ruang dari dua perangkat. Pastikan proxy tidak menahan SSE. Host yang kehilangan tab dapat memulihkan diri dengan PIN dan kode pemulihan yang ditampilkan di lobi.

Rancangan dan referensi lengkap: [Technical brief](docs/QUEUE-LIVE-TECHNICAL-BRIEF.md), [Technical plan](docs/QUEUE-LIVE-TECHNICAL-PLAN.md), dan [laporan deep research](../reports/Kuis%20Queue%20multipemain.md).

## Isi simulasi

- Tantangan pemula: 20 soal (10 Stack dan 10 Queue) tentang tambah/ambil/peek, isEmpty, kondisi kosong, underflow, perubahan referensi, serta urutan beberapa operasi. Umpan balik dan diagram langsung, retry tanpa penalti, dan progres per ruang selama tab terbuka.

- Gudang: tiga Stack linked-list, push, pop, peek, isEmpty, pencarian ID, batas jumlah/berat, dan perpindahan barang yang memvalidasi tujuan sebelum mengubah sumber.
- Stack: enam level per ruang (tumpuk tiga, kosongkan rak, ambil barang B, balik urutan, batas kapasitas, rencana dulu). Setiap level memberi 1–3 bintang terhadap par langkah.
- Baki hasil menampilkan nilai kembali dari pop, dequeue, peek, dan isEmpty, termasuk `None`.
- Lensa memuat struktur, kode, dan kontrol lanjutan. Push dan daftar dilakukan dengan satu tap dari dock aksi.
- Queue: mulai di FIFO dasar; tiga jalur prioritas tersedia sebagai mode lanjutan. Enam level per ruang (antre tiga, kosongkan antrean, batal di tengah, jam loket, prioritas tetap tertib, rencana pelayanan). Satu loket, lima menit per pasien, pelayanan tidak diinterupsi. Pemanggilan dilakukan manual setelah loket tersedia.
- Pembatalan pasien menunggu menggunakan pencarian dan penyambungan ulang linked-list, termasuk perubahan front/rear.
- Jam simulasi, estimasi tunggu berdasarkan antrean saat ini, laporan dilayani/dibatalkan/menunggu, dan pasien dalam pelayanan ditampilkan terpisah.
- Mode rencana pada level 6 di tiap ruang: susun langkah di dock, lalu jalankan sekali.
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

Tes Queue Live juga membuka server localhost pada port sementara untuk memeriksa otorisasi, state ronde, deadline, penyembunyian kunci/skor aktif, pengiriman ulang idempoten, peringkat seri, TTL, CSV, SSE reconnect, serta 60 peserta sintetis menyelesaikan 20 soal. Jam server disuntikkan agar tes cepat; ini bukan uji 60 perangkat fisik atau benchmark 60 koneksi SSE.

`node tests/quiz-browser.cjs` menjalankan server tes sendiri dan memeriksa host + dua konteks peserta di browser, 20 ronde, refresh jawaban, offline/reconnect, keyboard, escaping nama, unduh CSV, dialog penutupan, dan lebar 320–1440px. Gunakan `PLAYWRIGHT_MODULE`/`BROWSER_EXECUTABLE` seperti tes browser lainnya. Screenshot tersedia di `screenshots/quiz/`.

Dengan Python dan kedua DOCX di folder induk, jalankan `python tests/practicum-parity.py`. Tes ini memastikan empat cuplikan masih cocok dengan dokumen sumber, menjalankan cuplikan Python tersebut, dan membandingkan 12 keadaan/hasil dengan model JavaScript, termasuk kondisi kosong. Python hanya diperlukan untuk tes ini.

Tes browser tersimpan di `tests/browser.cjs`. Dengan server aktif dan Playwright yang sudah tersedia, jalankan `node tests/browser.cjs`. Bila paket tidak berada pada jalur modul standar, isi variabel lingkungan `PLAYWRIGHT_MODULE` dengan lokasi paket; `BROWSER_EXECUTABLE` dapat menunjuk Chromium yang sudah terpasang. Tes ini menghasilkan screenshot desktop dan ponsel di `screenshots/`, serta memeriksa drag mouse, emulasi sentuhan dan pembatalannya, kegagalan kapasitas, kamera, draft formulir, penyelesaian misi, dan reduced motion. Emulasi ini bukan pengujian perangkat ponsel fisik.

## Batas versi ini

Data dan progres level beserta bintang hanya berada di memori tab, dan kembali ke awal ketika halaman dimuat ulang. Mode dan level baru mengganti skenario ruang tersebut. Python ditampilkan untuk pembelajaran, bukan interpreter kode pengguna. Rekaman instruksi tersedia untuk empat operasi dasar; peek/isEmpty dan pembatalan masih berupa penjelasan algoritma yang diberi label berbeda. Cuplikan dokumen menghilangkan baris kosong; nomor baris relatif terhadap cuplikan, bukan nomor halaman dokumen. Operasi pointer inti O(1), sedangkan pencatatan seluruh node menambah O(n) per langkah untuk pembelajaran. JS juga mengembalikan data dari push/enqueue sebagai kemudahan aplikasi, berbeda dari return implisit None pada Python; tes kesetaraan memeriksa isi struktur dan hasil pop/dequeue. Jam dimajukan manual; kedatangan pasien melalui registrasi. Dunia isometrik menampilkan enam kotak teratas per rak dan lima pasien depan per jalur, dengan indikator jumlah yang tersisa; diagram node dan panel kontrol tetap mencakup seluruh data. Antrean klinik merupakan penyederhanaan tugas praktikum, bukan model pengambilan keputusan medis.

## Desain

Dasar putih–silver (#FFFFFF / #F4F5F9), indigo #2F39A9, biru #2E6FA0, cyan #49A4BB, turquoise #15D8B3. Ubuntu Regular/Medium disertakan secara lokal (lisensi di assets/UFL.txt); Consolas untuk kode dan referensi. SVG dunia dan diagram node berasal dari state linked-list yang sama. Animasi terbatas pada tindakan pengguna dan tidak memakai loop dekoratif. DESIGN.md dan .impeccable/design.json mencatat token dan pola antarmuka.

## Audit dan kurasi UI/UX

Tujuan misi tampil sebelum arena; hasil operasi dan tautan rekaman berada setelah tombol aksi. Ponsel memakai navigasi bawah dan prinsip LIFO/FIFO tetap terlihat. Teks utama 15px, metadata minimum 12px, serta tombol utama dan kamera minimum 44px. Penggantian skenario meminta konfirmasi jika eksperimen atau isian sudah berubah.

Tes tambahan `node tests/browser-audit.cjs` memakai Playwright yang sudah terpasang, variabel `PLAYWRIGHT_MODULE` dan `BROWSER_EXECUTABLE` yang sama dengan tes browser utama. Tes ini melayani berkas melalui routing browser sehingga tidak memerlukan server atau koneksi jaringan. Cakupan: dua ruang pada lima lebar layar (320, 390, 768, 1024, 1440px), kedua misi, prediksi dinamis, dialog konfirmasi/Escape, draft per rak, fokus SVG, reduced motion, serta gulir dan drag sentuh sintetis. Bukti berada di `screenshots/audit/`; laporan lengkap di `AUDIT-UIUX.md`.
