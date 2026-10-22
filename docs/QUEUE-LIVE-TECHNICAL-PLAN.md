# Technical plan: implementasi dan penerimaan Queue Live

Tanggal: 22 Oktober 2026, Asia/Jakarta. Dokumen ini menggabungkan rencana teknis, urutan implementasi yang sudah diwujudkan pada V1, dan pekerjaan pembuktian/pengerasan berikutnya. Status “kode tersedia” berarti terlihat pada berkas, bukan otomatis berarti seluruh tes, deployment, atau uji kelas sudah lulus. Kontrak payload, state, serta batas keamanan dirinci pada [technical brief](QUEUE-LIVE-TECHNICAL-BRIEF.md).

## 1. Tujuan dan definisi selesai

Satu host dapat membuka sesi Queue berisi 20 soal, mengundang peserta lintas perangkat, memulai ronde serentak, memberi waktu menjawab yang sama, membahas hasil, melanjutkan sampai selesai, melihat leaderboard dengan skor dan waktu, serta mengunduh CSV. Peserta cukup memakai kode enam digit dan nama panggilan. Skor tidak dapat ditentukan browser dan jawaban pertama terkunci.

Implementasi dianggap selesai untuk pilot setelah seluruh kondisi berikut mempunyai bukti:

1. Entry hanya muncul di materi Queue dan simulator Stack/Queue sebelumnya tetap berfungsi.
2. Host dan sedikitnya dua identitas peserta melalui lobby, 20 ronde, pembahasan, final, dan ekspor.
3. Semua klien memperoleh soal/fase yang sama melalui server; tidak ada key/poin aktif bocor sebelum review.
4. Benar/salah/timeout, deadline, retry, stale revision, role, dan expiry sesuai kontrak.
5. Refresh pada tab sama memulihkan identitas dan jawaban yang sudah diterima tanpa menambah skor.
6. UI dapat digunakan pada ponsel dan keyboard, dengan status koneksi/jawaban yang jelas.
7. Operator memahami kebutuhan LAN, proses Node yang tetap hidup, TTL, dan kehilangan data saat restart.

Kapasitas 60 peserta pada kode, compliance aksesibilitas penuh, operasi publik, dan durabilitas hasil merupakan klaim berbeda yang membutuhkan bukti tersendiri. Keputusan memulai pilot harus menyatakan mana yang telah diuji dan mana yang masih risiko.

## 2. Inventaris dan dependensi pekerjaan

| Area | Berkas terkait | Dependensi / dampak |
|---|---|---|
| Konten dan aturan | `quiz-bank.js`, materi/model Queue | Soal sesuai linked-list, pembatalan, prioritas, dan pelayanan simulator |
| Domain/server | `quiz-server.js` | Bank server-only, jam server, token, phase, rank, rate limit |
| HTTP integration | `serve.js`, `package.json` | API didahulukan, static allowlist tetap ketat, mode LAN |
| UI | `quiz.html`, `quiz-client.js`, `quiz.css`, `styles.css` | Kontrak snapshot, state role, reconnect, timer, hasil |
| Entry/caller | `index.html`, `app.js` | Hanya Queue; tidak mengubah logic Node/Stack/transfer |
| Tes | `tests/` dan suite lama | Unit skor/bank, HTTP, SSE, regresi, browser |
| Operasi/dokumen | README, report, technical brief/plan | LAN, batas keamanan, bukti acceptance, pilot |

Urutan minimum: tetapkan aturan → bank + server → routes → client → entry Queue → tes → pilot. Satu server yang sama menyajikan UI/API sehingga tidak perlu CORS, service tambahan, instalasi library, atau proses build baru. Materi kuis mengikuti simulator, tetapi kuis tidak mengimpor model visual ke browser untuk menghitung skor.

## 3. Keputusan arsitektur yang dikunci untuk V1

| Keputusan | Alasan | Konsekuensi yang diterima |
|---|---|---|
| Host-paced | Kebutuhan mengerjakan dan membahas bersama | Kelas menunggu host untuk pindah nomor |
| 20 single-choice tetap | Penilaian langsung dan aturan mudah diaudit | Belum editor/pengacakan/partial credit |
| Benar 800 + bonus 0–200 | Ketepatan mendapat porsi besar, kecepatan tetap berarti | Skor tetap tidak menjamin jumlah benar selalu menang |
| Rank skor, benar, waktu benar | Sesuai skor-kecepatan dengan akurasi terlihat | Exact tie mendapat rank sama |
| POST + SSE fetch | Arus utama broadcast; fetch mengirim bearer header | Parser/reconnect dikelola client sendiri |
| sessionStorage per tab | Host/pemain terpisah, refresh mudah, token tidak di URL | Token dapat dibaca JavaScript; tab hilang sulit pulih |
| Satu proses RAM, TTL 3 jam | Perubahan minimum pada server yang sudah ada | Restart menghilangkan seluruh sesi |
| Join hanya lobby | Kesempatan 20 soal setara dan state sederhana | Peserta baru yang terlambat tidak dapat ikut |
| Kunci + skor aktif ditahan sampai review | Feedback pemain cepat tidak membocorkan kebenaran | Menunggu feedback sampai ronde berakhir |
| Review menyatu dengan leaderboard | Fase dan kontrol minimum | Tidak ada tombol leaderboard terpisah |

Alternatif cookie HttpOnly atau rumus 600/400 pada catatan riset adalah pilihan yang dievaluasi, bukan implementasi sekarang. Jika pilihan berubah, server, UI aturan, test expected values, CSV, dan seluruh dokumen harus diperbarui bersama.

## 4. Tahapan implementasi dan status

Estimasi berikut adalah perkiraan hari kerja efektif untuk mengerjakan ulang paket yang sama dari awal oleh satu engineer yang memahami repository. Angka bukan catatan durasi aktual dan tidak mencakup waktu tunggu kelas/hosting. Tahap kode sudah tersedia ketika dokumen ditulis; tahap verifikasi memerlukan bukti hasil terpisah.

| Fase | Deliverable dan pekerjaan | Estimasi | Status saat penulisan |
|---|---|---:|---|
| A. Riset dan keputusan | Dokumentasi primer Kahoot/Wayground, scope Queue, aturan skor/phase, risiko | 0,5–1 hari | Notes, report, brief/plan tersedia |
| B. Konten | Bank 20 ID unik, kunci, alasan, durasi, label prioritas/pelayanan | 0,5–1 hari | Kode tersedia; review dosen belum terbukti |
| C. Service | Room, token, join, FSM, deadline, scoring/rank, snapshot role, TTL, CSV | 1–1,5 hari | Kode tersedia |
| D. Transport/routes | API JSON, SSE fetch contract, allowlist, LAN env | 0,5–1 hari | Kode tersedia |
| E. UI dan integrasi | Host/player entry, lobby, soal/review/final, reconnect, entry Queue | 1–1,5 hari | Kode tersedia |
| F. Verifikasi otomatis | Bank/domain/HTTP/SSE, auth/leak/race, suite regresi | 0,5–1 hari | Run terakhir: 61/61 lulus, termasuk HTTP 60 peserta/20 soal dengan clock uji |
| G. Browser dan pilot | Multi-identitas, keyboard/ponsel, perangkat LAN, load awal, revisi soal | 1–2 hari | Run ulang akhir browser host + 2 context/20 ronde lulus; kelas nyata masih perlu |

Total perkiraan pengerjaan dari awal 5–9 hari kerja termasuk pilot awal; bukan janji jadwal atau kebutuhan menunggu sebelum mencoba kode yang sudah tersedia. Nilai estimasi terbesar dipengaruhi hasil uji jaringan dan revisi konten kelas.

### A. Menetapkan aturan sebelum memperluas kode

Tentukan satu formula dan satu mode. Cocokkan kata front/rear, nilai `None`, FIFO dasar, prioritas lanjutan, dan pelayanan tanpa interupsi dengan bahan praktikum. Pastikan host tidak ikut rank, late join ditolak sejak countdown, expiry absolut, dan close mengakhiri seluruh room. Sebelum menulis fitur tambahan, tanyakan bukti kebutuhan setelah pilot; akun, QR, audio, dan mode tim tidak membantu membuktikan inti sesi ini.

### B. Menyusun bank 20 yang dapat diaudit

Setiap entri memiliki id/topic/seconds/prompt/choices/answer/explanation. Tetapkan orientasi front→rear pada soal urutan. Gunakan opsi pengecoh dari salah konsep yang dapat dijelaskan, bukan permainan kata. Bagikan kunci secara seimbang dan hindari dua opsi benar. Untuk soal kompleksitas, jelaskan operasi pointer inti dibanding perekaman visual; untuk prioritas, jelaskan mode lanjutan. Validasi otomatis bentuk/ID/rentang tidak menggantikan review dosen terhadap makna.

### C. Menyediakan sumber kebenaran server

Bangun room dan pemain dengan token crypto, tanpa percaya id/role/skor/waktu dari browser. Implementasikan `lobby → countdown → question → review` berulang, lalu finished. Seluruh transisi memeriksa fase; start minimal satu pemain; next hanya sebelum nomor 20; finish hanya setelah review 20. Pindah ke review pada semua roster menjawab atau deadline; offline tidak mengurangi roster. Host command memakai expected revision. Simpan jawaban pertama, tangani retry identik, tolak pilihan kedua, dan hitung score/correct/correctMs satu kali.

Fungsi `view` menjadi titik kebijakan informasi: jangan kirim future questions, key/explanation sebelum review, token, atau hasil individu lain. Pada question, kurangi skor jawaban ronde aktif dari snapshot. Bank tidak boleh masuk asset static. Export hanya host/finished, CSV UTF-8 BOM, quote dan proteksi pemicu formula pada nickname. TTL, cleanup service, dan limits selesai bersama lifecycle, bukan pekerjaan “nanti”.

### D. Menghubungkan HTTP dan SSE

`serve.js` memanggil `quiz.handle()` sebelum static routing dan tetap menyediakan allowlist sempit. `createLabServer({now})` memungkinkan test menyuntikkan waktu tanpa menunggu semua durasi nyata. JSON body dibatasi 4 KiB dan shape/range divalidasi. SSE mengirim snapshot dengan header no-store/no-transform, flush awal, dan heartbeat 15s. Bersihkan stream saat close, batasi dua koneksi per credential, putus socket lambat yang melampaui buffer. Pembuatan/join room diberi limit IP yang tidak terlalu kecil untuk kelas satu NAT.

### E. Menyelesaikan UI sampai kondisi gangguan

UI entry memiliki form join dan create, aturan skor/privasi/TTL, pilihan pengali1/2/3, dan penjelasan LAN. Lobby menampilkan PIN, tautan, roster, serta tombol start. Countdown menyiapkan nomor; question menampilkan prompt dan pilihan berlabel, waktu, jumlah submit; review menampilkan kunci, alasan, distribusi, dan leaderboard; final menampilkan podium, akurasi, review 20, dan download host.

Client menyimpan credential per tab, membuka fetch stream Authorization, mengabaikan revision lama, dan mengkalibrasi timer dari snapshot. Saat POST tidak pasti, tampilkan pending dan ambil snapshot; retry hanya pilihan pertama yang sama. Offline menonaktifkan aksi sampai tersambung, bukan mengantre jawaban melewati deadline. Logout tampilan memutus stream tanpa menghapus roster. Host close memakai konfirmasi yang membedakannya dari keluar tampilan. Entry pada simulator muncul hanya untuk Queue; tautan tab baru mencegah stream bersaing dengan lifecycle arena.

## 5. Test matrix wajib sebelum menyatakan V1 siap

Tabel ini adalah rencana pembuktian, bukan hasil lulus. Pilih tes yang memeriksa perilaku eksternal atau aturan penting; hindari tes yang hanya menyalin detail render.

| ID | Lapisan / kasus | Bukti yang diharapkan |
|---|---|---|
| U01 | Bank 20 | Tepat20, id unik, empat opsi, key integer0..3, explanation/prompt terisi, durasi positif |
| U02 | Batas skor | Benar elapsed0=1000, setengah=900, dekat deadline≈800, salah=0 |
| U03 | Ranking | Skor desc, benar desc, correctMs asc; exact tie 1,1,3 |
| H01 | Create/join dua peserta | 201, PIN6, token48hex unik, roster sama, host bukan rank |
| H02 | Nama/input | Trim/NFKC, nama duplikat case-insensitive, kontrol, pilihan float/out-of-range ditolak |
| H03 | Start/clock | Start butuh pemain; countdown 3s; answer sebelum startsAt ditolak |
| H04 | Batas deadline | `deadline-1` diterima; `deadline`/lebih ditolak walau callback belum berjalan |
| H05 | All answered | Review saat semua roster menjawab; satu offline belum jawab tetap menunggu |
| H06 | Duplicate | Retry sama tidak menambah skor; beda pilihan ditolak; nomor lama sesudah next ditolak |
| H07 | Host revision | Revision stale mendapat409; double-next tidak melompati nomor |
| H08 | Role/token | Pemain tak bisa command/export; host tak bisa answer; token ruang lain mendapat401 |
| H09 | Kebocoran | Tidak ada key/explanation/future question pada lobby/countdown/question, termasuk host |
| H10 | Side channel skor | Total score/correct/correctMs tetap ronde sebelumnya selama question |
| H11 | SSE | Event awal valid; perubahan roster/fase terlihat kedua anggota; disconnect memperbarui connected |
| H12 | Late join/reconnect | Join baru setelah start409; token lama state/events boleh dan jawaban tetap |
| H13 | Expiry | Sesudah3h akses404 dan stream berakhir; cleanup tidak me-reset skor ruang lain |
| H14 | Seluruh 20 | 20 ronde lengkap, review setiap nomor, finished hanya di akhir, review 20 tersedia |
| H15 | CSV | Host-only finished-only, rank/skor sama UI, quote/BOM, nickname pemicu formula aman |
| H16 | Boundary request | JSON rusak 400, body 413, type 415, cross-site 403, method 405, limiter 429 |
| H17 | Static allowlist | UI/client/css200; `/quiz-bank.js` dan `/quiz-server.js`404 |
| H18 | Close | Semua role melihat closed; tidak menerima jawaban/next baru; dialog tidak salah mengakhiri |
| B01 | Multi-identitas browser | Satu host + dua peserta berbeda, tidak berbagi token secara tak sengaja |
| B02 | Refresh | Refresh setelah answer menerima pending/receipt benar, skor tidak ganda |
| B03 | Offline/reconnect | Status jelas, input disabled, reconnect kembali ke fase server tanpa reset timer |
| B04 | Navigasi keluar | Stream ditutup, kembali ke sesi aktif tetap identitas sama |
| B05 | Keyboard | Tab/focus terlihat, opsi Enter/Space, dialog cancel/close, tidak ada keyboard trap |
| B06 | Visual mobile | 360px dan landscape, teks panjang, tabel dapat digulir, opsi tidak terpotong |
| B07 | Aksesibilitas | Zoom 200%, pembaca layar, status tidak spam timer, makna tak hanya warna |
| R01 | Regresi simulator | Suite model/execution/level/challenges/design tetap lulus; entry Stack disembunyikan |
| L01 | LAN dua perangkat | IP host yang sama, start/answer/review serentak, refresh pemain, ekspor host |
| L02 | Beban awal 30 | 30 pemain/satu room SSE, submit berdekatan, memori/error/latensi dicatat |

Jika harness Node mendukung, gunakan clock inject untuk countdown/deadline/TTL agar uji deterministik dan cepat. Tetap uji satu timer nyata singkat atau alur nyata untuk memastikan scheduling terpasang. Jangan menganggap helper scoring saja membuktikan late-answer ditolak; acceptance perlu melalui handler HTTP. Uji SSE dapat membaca event pertama dan membatalkan stream agar test runner tidak menggantung. Setiap test server harus ditutup dalam finally/cleanup.

Jalankan suite dari folder aplikasi:

```powershell
npm test
```

Jalankan browser audit yang relevan dengan aplikasi lokal sesuai harness repository. Hasil perlu dicatat sebagai command + tanggal + jumlah tes/cakupan + keterbatasan. Jangan menyatakan kepatuhan WCAG, kapasitas 60, atau deployment publik hanya dari lolos unit test.

Pemetaan ke bukti yang ada (nama tes di `tests/quiz.test.js`, browser di `tests/quiz-browser.cjs`, lainnya seperti ditulis):

| ID | Bukti | Status |
|---|---|---|
| U01 | Exactly 20 coherent Queue questions | Lulus |
| U02, U03 | Quiz scoring; Strict server deadline (rank 1,1,3) | Lulus |
| H01, H02 | Room validation, duplicate nicknames | Lulus |
| H03, H04, H05 | State transitions; Strict server deadline (pemain absen) | Lulus |
| H06, H07 | State transitions (retry identik, pilihan kedua, revision) | Lulus |
| H08 | Room validation (401 tanpa token, 403 peran pemain, 401 token host/pemain ruang lain pada state/events/results/command/answer) | Lulus |
| H09, H10 | State transitions (kunci tersembunyi, skor ronde ditahan) | Lulus |
| H11, H12 | SSE initial snapshots and reconnect; State transitions (late join 409) | Lulus |
| H13 | Room expiry and bounded JSON/rate limits | Lulus |
| H14, H15, H18 | 60 simultaneous participants (20 ronde, CSV, closed) | Lulus |
| H16 | Room expiry and bounded JSON/rate limits (400/413/415/429) | Lulus |
| H17 | Static allowlist | Lulus |
| R01 | `npm test`: suite model/execution/level/challenges/design | Lulus (61/61) |
| B01–B04, B06 | `quiz-browser.cjs` (host + 2 peserta, refresh, offline, 320–1440 px, pemulihan host di context baru) | Lulus |
| B05, B07 | axe-core WCAG 2.2 AA pada 10 state dan lebar 320/390/640/1280: nol pelanggaran | Sebagian: pembaca layar manual belum |
| L01 | Dua perangkat LAN | Tidak dijalankan (di luar lingkup sesi ini) |
| L02 | Beban 30 SSE × 20 ronde, loopback dan lewat proxy nginx HTTPS | Lulus sintetis; bukan jaringan kelas |
| Baru | Allowlist Host, proxy XFF, idempotency, pemulihan host, snapshot restart, jam monotonic | Lulus |

## 6. Skenario penerimaan manual yang dapat direplikasi

1. Jalankan server LAN, buka halaman dari laptop dan dua browser/perangkat peserta. Gunakan profil/identitas tab yang benar-benar berbeda.
2. Host memilih durasi 1× dan membuat ruang. Dua peserta memakai nama berbeda dan PIN yang sama; semua melihat roster yang sama.
3. Host menekan mulai; semua melihat countdown 3 detik lalu q01. Pemain A menjawab benar cepat; pemain B menjawab salah. Sebelum B submit, A tidak boleh mengetahui key/poin dari snapshot.
4. Review menampilkan key, distribusi 2 jawaban, skor A antara 800–1000, skor B 0. Host next satu nomor saja.
5. Putus koneksi B pada soal berikutnya. A menjawab, tetapi review tidak terbuka sampai B kembali menjawab atau deadline. Refresh A mempertahankan pilihan dan skor.
6. Teruskan sampai 20 dengan variasi benar/salah/tidak menjawab. Host finish menampilkan podium serta review 20. Semua ranking harus identik.
7. Host mengunduh CSV; cocokkan skor/benar/waktu beberapa pemain. Peserta tidak dapat mengunduh hasil host lewat endpoint.
8. Host tutup ruang melalui dialog. Semua melihat closed; kuis tak dapat dilanjutkan. Simulator tetap dapat dibuka kembali.
9. Buat ruang terpisah untuk uji restart: restart server, lalu verifikasi pemberitahuan ruang hilang. Lakukan ini hanya pada sesi uji yang boleh dibuang.

Pengujian jam/deadline yang presisi, key leakage, dan auth harus otomatis; langkah manual tidak cukup menilai milidetik atau seluruh payload. Pilot kelas berfokus pada pemahaman instruksi, durasi, kondisi jaringan, dan kenyamanan feedback.

## 7. Pilot kelas dan pengukuran

Target pertama satu room 30 peserta, dipilih sebagai target uji bukan kapasitas terverifikasi. Jalankan beban sintetis untuk memastikan seluruh koneksi mendapat snapshot dan tidak ada skor ganda, lalu sesi kecil dua perangkat nyata, baru kelas. Penggunaan banyak tab satu browser tidak mewakili 30 perangkat karena batas koneksi dan throttling background berbeda.

Catat: jumlah peserta/jenis perangkat, topologi Wi-Fi, ping/jeda snapshot yang diukur harness, p50/p95 bila tersedia, error HTTP, jumlah reconnect, penggunaan memori awal/akhir, waktu CPU, dan kesesuaian skor final di seluruh client. Ambang awal diskusi: mayoritas update LAN <1 detik, nol skor ganda, nol key sebelum reveal, seluruh peserta dapat mencapai hasil atau mendapat alasan putus yang jelas. Ambang waktu adalah target yang harus diukur, bukan janji teknis.

Untuk konten, catat persentase benar per nomor, proporsi timeout, komentar soal ambigu, dan durasi review. Nomor dengan banyak timeout dapat memerlukan waktu lebih lama, penyederhanaan prompt, atau pengajaran ulang; angka salah saja tidak membuktikan soal buruk. Dosen meninjau q13 kompleksitas dan q16–q19 mode lanjutan khususnya agar perbedaan antara algoritma Queue dan aturan klinik dipahami.

## 8. Deployment dan release checklist

| Lingkungan | Persiapan | Kriteria go |
|---|---|---|
| Lokal | Node tersedia, `npm start`, loopback | UI dan suite otomatis berjalan |
| LAN | `npm run start:lan`, IP privat, izin jaringan yang sesuai | Perangkat kedua dapat join, stream tidak tertahan, host tidak sleep |
| Internet pilot | Node long-lived satu instance, domain/TLS, proxy SSE | Origin/Host diperketat, stream/timeout diverifikasi, batas abuse disepakati |
| Pemakaian hasil resmi | Penyimpanan, recovery, autentikasi institusi, kebijakan retensi | Belum tercakup V1; rancangan tambahan diperlukan |

Jangan mengubah firewall otomatis atau melakukan deployment publik tanpa target/lingkup yang diberikan. Implementasi lokal yang dapat direview tetap diselesaikan terlebih dahulu. Untuk internet, configured allowed origin/host penting karena V1 membandingkan Origin dengan Host request; gunakan proxy tepercaya dan jangan percaya forwarded IP dari sembarang client. Jika reverse proxy menggabungkan semua IP, limiter create/join harus dievaluasi agar satu kelas tidak terblokir tidak sengaja.

Sebelum sesi: cek IP, daya, jaringan kedua, tab host, durasi, dan alias peserta. Sesudah sesi: finish 20, unduh CSV, verifikasi file terbuka, lalu tutup ruang. Retensi tiga jam absolut; proses restart menghapus semuanya. Backup CSV adalah tanggung jawab operator sampai penyimpanan permanen ditambahkan.

Rollback minimum untuk masalah UI integrasi adalah menyembunyikan entry Queue tanpa menghapus simulator; service dapat dihentikan setelah menyelamatkan CSV selesai. Mengembalikan server ke versi static-only akan memutus semua kuis aktif; jangan lakukan saat kelas masih berjalan. Tidak ada migrasi database yang harus dibatalkan.

## 9. Risiko terbuka dan pekerjaan berikutnya

Status pembaruan 22 Oktober 2026: P1 origin/host dan trusted proxy, P1 idempotency create/join, P1 pemulihan host, dan P1 durable storage sudah diimplementasi dan diuji (lihat §10). Sisa: P2 kapasitas (load 60 dan jaringan kelas), P2 akses (audit pembaca layar dan pilot), serta deployment publik yang belum dijalankan.

| Prioritas | Pekerjaan | Pemicu / acceptance tambahan | Estimasi terpisah | Status 22 Okt 2026 |
|---|---|---|---:|---|
| P1 sebelum publik | Configured origin/host dan trusted proxy, abuse controls | Domain/hosting ditetapkan; cross-origin dan proxy test lulus | 0,5–1 hari | Kode + tes selesai; domain publik belum |
| P2 keandalan | Perluas uji clock/scheduling pada monotonic timing yang sudah ada | Clock proses tidak tergantung perubahan jam dinding; latensi tetap diukur | 0,5 hari | Terbuka |
| P1 bila sesi penting | Idempotency create/join dan pemulihan host | Respons hilang tak membuat identitas/room tak terjangkau | 1–2 hari | Selesai; idempotency hanya selama proses hidup |
| P1 bila hasil wajib tersimpan | Durable storage dan restore state | Restart memulihkan room/answers tepat satu kali | 2–4 hari | Selesai (snapshot JSON); belum database |
| P2 kapasitas | Profil fan-out, load 60, optimasi snapshot | Metrik menunjukkan batas atau kelas membutuhkan 60 | 1–2 hari | Terbuka; baru 30 SSE sintetis |
| P2 akses | Audit teknologi bantu dan akomodasi waktu | Pilot menemukan hambatan; bukti audit terukur | 1–2 hari | Terbuka; axe lulus, pembaca layar belum |
| Sesudah bukti kebutuhan | Bank lain/editor/akun | Kurikulum/pemakaian nyata membutuhkan | Estimasi setelah scope | Belum dimulai |

Estimasi roadmap merupakan perkiraan awal, dapat berubah setelah kebutuhan durability/hosting/identity jelas. Database/shared broker dan multi-instance baru dibutuhkan bila operasional menuntutnya; WebSocket tidak otomatis menghilangkan kebutuhan state, validasi, atau pemulihan. Soal Stack dan mode lain sengaja ditunda sampai alur Queue mendapat bukti kelas.

## 10. Catatan pembuktian saat serah terima

Isi catatan release bersama hasil aktual, bukan menandai semua item otomatis selesai:

```text
Tanggal dan versi/commit:
Command tes otomatis dan hasil:
Browser/context yang diuji:
Perangkat nyata dan jaringan:
Jumlah peserta load test serta metrik:
Review dosen/konten:
Deployment/URL jika ada:
Known issues dan batas pilot:
```

Catatan yang sudah dilaporkan pada 22 Oktober 2026: `npm test` lulus 55/55, termasuk integrasi 60 peserta HTTP melalui 20 soal dengan clock uji. Run ulang akhir `tests/quiz-browser.cjs` sesudah perubahan clock/UI lulus host dan dua context peserta berbeda melalui 20 ronde, refresh jawaban diterima, offline/reload reconnect, Enter keyboard, nickname `<Nara>` ter-escape, unduh CSV, dan dialog tutup cancel/confirm, tanpa pageerror. Screenshot tersedia di `screenshots/quiz/`; lebar 320/390/768/1024/1440 tidak menimbulkan overflow mendatar halaman. Ini tidak sama dengan 60 perangkat nyata atau 60 koneksi SSE simultan.

`tests/practicum-parity.py` lulus empat cuplikan DOCX dan 12 state Python/JavaScript termasuk underflow. Audit regresi browser umum dicoba tetapi gagal lebih awal pada `stack320: smallest SVG text 7.5px`. Audit ulang memakai index/app baseline HEAD yang dimuat di memori menghasilkan kegagalan identik 7,5 px: isu tersebut sudah ada sebelum fitur ini, tetap terbuka, dan tidak disamarkan sebagai hasil lulus. Pemeriksaan multi-perangkat kelas, beban SSE maksimum, audit pembaca layar, persistence, dan hosting publik belum diasumsikan terjadi.

Verifikasi ulang 22 Oktober 2026 (Node v22.19.0, Windows, Chrome sistem):
- `npm test` → 55/55 lulus (3,0 dtk).
- `node tests/quiz-browser.cjs` dengan `PLAYWRIGHT_MODULE` menunjuk ke `playwright-core` (dipasang di luar proyek) dan `BROWSER_EXECUTABLE` ke Chrome → PASS: host + 2 peserta, 20 ronde, refresh, offline/reload, keyboard, escaping HTML, CSV, lebar 320–1440 px.
- `python tests/practicum-parity.py` → PASS (4 cuplikan DOCX, 12 state).
- Beban sintetis (`node tests/quiz-load.mjs`; dengan `BASE=` untuk URL deploy): 1 host + 30 peserta SSE, 20 ronde, satu proses, loopback. Tanpa error stream/jawaban; nol kebocoran kunci sebelum review; leaderboard identik di 31 klien; skor tiap peserta cocok dengan snapshot sendiri; CSV host 31 baris (header + 30); CSV peserta 403. Fan-out p95: hitung mundur ≈12 ms, jawaban→review ≈23 ms; lag mulai soal maks 108 ms (interval tick 100 ms).
- Keterbatasan: loopback, bukan Wi-Fi kelas; RSS 51→201 MB mencakup log snapshot di sisi skrip uji, belum dipisah dari memori server; belum ada perangkat nyata, LAN dua perangkat (L01), pembaca layar, atau review dosen.

Verifikasi lanjutan 22 Oktober 2026 (setelah origin/host, idempotency, pemulihan host, snapshot, dan artefak deploy):
- `npm test` → 61/61 lulus (6 tes baru di `tests/quiz.test.js`).
- `quiz-browser.cjs` PASS setelah perubahan client; `practicum-parity.py` PASS.
- Pemulihan host di browser bersih: kode salah ditolak; kode benar masuk sebagai host; tab lama turun ke layar entry. Langkah ini sekarang bagian dari `tests/quiz-browser.cjs`.
- Beban 30 SSE × 20 ronde lewat nginx 1.22 HTTPS (`deploy/nginx.conf.template` dirender ke localhost, sertifikat self-signed): tanpa error; nol kebocoran kunci; leaderboard identik di 31 klien; fan-out p95 ≈17 ms (hitung mundur ≈12 ms).
- Restart: proses dimatikan paksa dua kali. Peserta dan host melanjutkan dengan token yang sama lewat proxy; token host lama ditolak 401 setelah recover; snapshot tidak memuat token atau kode pemulihan mentah (diperiksa dengan grep).
- axe-core 4.10.2, WCAG 2.2 AA: nol pelanggaran pada entry, lobi, soal, dan pembahasan di lebar 320, 390, 640, dan 1280 px dengan reduced motion.
- `docker compose config` tervalidasi (`QUIZ_HOST` wajib). `docker build` belum dijalankan: daemon Docker tidak aktif di mesin ini.
- Keterbatasan: idempotency hanya berlaku selama proses hidup (create ulang setelah restart membuat ruang baru). Snapshot ditulis 200 ms setelah perubahan terakhir. Kode pemulihan host harus disimpan dosen. Belum ada deployment publik, dua perangkat LAN, pembaca layar manual, atau review dosen.

Penutupan celah tes 22 Oktober 2026:
- H08 diperluas di `tests/quiz.test.js`: token host dan pemain dari ruang lain ditolak 401 pada state, events, results, command, dan answer. `npm test` → 61/61 lulus (assertion ditambah ke tes yang ada, jumlah tes tetap).
- `tests/quiz-browser.cjs` kini memuat pemulihan host di browser context baru → PASS dengan `playwright-core` dan Chrome sistem.
