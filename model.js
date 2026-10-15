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
    const node = new Node(data); node.next = this.top; this.top = node;
    this.count++; this.weight = nextWeight; return data;
  }
  pop() {
    if (!this.top) return null;
    const data = this.top.data; this.top = this.top.next;
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
    const node = new Node(data);
    if (this.rear) this.rear.next = node; else this.front = node;
    this.rear = node; this.count++; return data;
  }
  dequeue() {
    if (!this.front) return null;
    const data = this.front.data; this.front = this.front.next;
    if (!this.front) this.rear = null;
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
