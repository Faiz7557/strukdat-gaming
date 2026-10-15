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
