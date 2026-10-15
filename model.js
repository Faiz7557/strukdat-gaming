import { beginExecution } from './execution.js';

export class Node {
  constructor(data) { this.data = data; this.next = null; }
}

export class Stack {
  constructor(maxItems = 6, maxWeight = 30) {
    this.top = null; this.count = 0; this.weight = 0;
    this.maxItems = maxItems; this.maxWeight = maxWeight;
  }
  push(data) {
    if (!data || !data.id || !data.name?.trim() || !Number.isFinite(data.weight) || data.weight <= 0)
      throw new Error('ID, nama, dan berat positif wajib diisi.');
    // shortcut: kilogram weights use six decimals; upgrade for sub-milligram measurements.
    const nextWeight = Math.round((this.weight + data.weight) * 1e6) / 1e6;
    if (this.count >= this.maxItems || nextWeight > this.maxWeight)
      throw new Error('Kapasitas rak tidak cukup. Pilih rak lain atau ambil barang terlebih dahulu.');
    const step = beginExecution(this, 'push', { data });
    step(0, 'Masuk push; data masukan belum terhubung ke Stack.');
    const node = new Node(data);
    step(1, 'Node dibuat dengan next = None. Top belum berubah.', { new_node: node });
    node.next = this.top;
    step(2, 'next milik node baru menunjuk top lama. Top masih tetap.');
    this.top = node;
    step(3, 'Top kini menunjuk node baru. Inilah alasan barang baru berada paling atas.');
    this.count++; this.weight = nextWeight; return data;
  }
  pop() {
    const step = beginExecution(this, 'pop');
    step(0, 'Masuk pop; amati node yang ditunjuk top.');
    step(1, this.top ? 'top is None bernilai False; return None dilewati.' : 'top is None bernilai True; jalankan cabang kosong.');
    if (!this.top) { step(2, 'Kembalikan None; tidak ada referensi yang berubah.', { hasil: null }); return null; }
    const data = this.top.data;
    step(3, 'Simpan data top ke variabel lokal sebelum top dipindahkan.', { data });
    this.top = this.top.next;
    step(4, 'Top berpindah ke next. Node lama tidak lagi dicapai dari top.');
    step(5, 'Kembalikan data yang tadi disimpan.', { hasil: data });
    this.count--; this.weight = Math.max(0, Math.round((this.weight - data.weight) * 1e6) / 1e6); return data;
  }
  peek() { return this.top?.data ?? null; }
  isEmpty() { return this.top === null; }
  values() { const out = []; for (let n = this.top; n; n = n.next) out.push(n.data); return out; }
}

export function transfer(source, destination) {
  if (source === destination) throw new Error('Pilih rak tujuan yang berbeda.');
  const data = source.peek();
  if (!data) throw new Error('Rak sumber kosong. Tidak ada barang untuk dipindahkan.');
  destination.push(data); source.pop(); return data;
}

export class Queue {
  constructor() { this.front = null; this.rear = null; this.count = 0; }
  enqueue(data) {
    const step = beginExecution(this, 'enqueue', { data });
    step(0, 'Masuk enqueue pada satu Queue yang dipilih.');
    const node = new Node(data);
    step(1, 'Buat node baru; node ini belum masuk ke urutan antrean.', { new_node: node });
    step(2, this.rear ? 'rear is None bernilai False; gunakan else.' : 'rear is None bernilai True; antrean masih kosong.');
    if (!this.rear) {
      this.front = node;
      step(3, 'Front menunjuk node pertama; rear masih None.');
      this.rear = node;
      step(4, 'Rear menunjuk node yang sama dengan front.');
    } else {
      step(5, 'Masuk cabang Queue yang sudah berisi.');
      this.rear.next = node;
      step(6, 'next milik rear lama disambungkan ke node baru.');
      this.rear = node;
      step(7, 'Rear dipindahkan ke node baru; front tetap.');
    }
    this.count++; return data;
  }
  dequeue() {
    const step = beginExecution(this, 'dequeue');
    step(0, 'Masuk dequeue pada jalur yang dipilih.');
    step(1, this.front ? 'front is None bernilai False; return None dilewati.' : 'front is None bernilai True; antrean kosong.');
    if (!this.front) { step(2, 'Kembalikan None tanpa mengubah Queue.', { hasil: null }); return null; }
    const data = this.front.data;
    step(3, 'Simpan data pasien paling depan.', { data });
    this.front = this.front.next;
    step(4, 'Front berpindah ke next; data pasien lama tetap ada pada variabel lokal.');
    step(5, this.front ? 'Front masih ada; rear tidak perlu diubah.' : 'Front menjadi None; rear juga perlu dikosongkan.');
    if (!this.front) { this.rear = null; step(6, 'Rear diubah menjadi None. Kedua ujung kini kosong.'); }
    step(7, 'Kembalikan data pasien untuk diproses oleh loket.', { hasil: data });
    this.count--; return data;
  }
  peek() { return this.front?.data ?? null; }
  isEmpty() { return this.front === null; }
  remove(id) {
    let previous = null, node = this.front;
    while (node && node.data.id !== id) { previous = node; node = node.next; }
    if (!node) return null;
    if (previous) previous.next = node.next; else this.front = node.next;
    if (this.rear === node) this.rear = previous;
    this.count--; return node.data;
  }
  values() { const out = []; for (let n = this.front; n; n = n.next) out.push(n.data); return out; }
}

export const priorities = ['kritis', 'darurat', 'non-darurat'];
export class Clinic {
  constructor() {
    this.queues = priorities.map(() => new Queue()); this.time = 0;
    this.active = null; this.served = 0; this.cancelled = 0; this.registered = 0;
  }
  register(patient) {
    const rank = priorities.indexOf(patient.priority);
    if (rank < 0 || !patient.id || !patient.name?.trim()) throw new Error('Isi ID, nama, dan tingkat kegawatan yang valid.');
    const all = this.queues.flatMap(q => q.values());
    if (all.some(p => p.id === patient.id) || this.active?.patient.id === patient.id)
      throw new Error('ID pasien sudah digunakan dalam antrean atau pelayanan.');
    this.registered++;
    return this.queues[rank].enqueue({ ...patient, arrival: this.time });
  }
  call() {
    if (this.active) throw new Error('Pelayanan sedang berlangsung. Selesaikan terlebih dahulu.');
    const queue = this.queues.find(q => !q.isEmpty());
    if (!queue) return null;
    const patient = queue.dequeue(); this.active = { patient, endsAt: this.time + 5 };
    return patient;
  }
  advance(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) throw new Error('Waktu harus berupa angka positif.');
    this.time += minutes;
    if (this.active && this.time >= this.active.endsAt) {
      const done = this.active.patient; this.active = null; this.served++; return done;
    }
    return null;
  }
  cancel(id) {
    for (const q of this.queues) { const p = q.remove(id); if (p) { this.cancelled++; return p; } }
    throw new Error('Pasien tidak sedang menunggu; pasien dalam pelayanan tidak dapat dibatalkan.');
  }
  waiting() { return this.queues.reduce((sum, q) => sum + q.count, 0); }
  estimate(id) {
    let minutes = this.active ? Math.max(0, this.active.endsAt - this.time) : 0;
    for (const q of this.queues) for (const p of q.values()) {
      if (p.id === id) return minutes;
      minutes += 5;
    }
    return null;
  }
}
