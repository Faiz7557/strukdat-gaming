// Python excerpts from Percobaan Praktikum; blank lines are omitted for the viewer.
export const lessons = {
  push: {
    document: 'PRAKTIKUM 6 Stack.docx', section: 'Membuat operasi push',
    lines: ['def push(self, data):', '    new_node = Node(data)', '    new_node.next = self.top', '    self.top = new_node'],
    meaning: 'Satu kotak mewakili data dalam sebuah Node. Mengubah top mengubah pintu akses Stack; kotak lain tidak perlu digeser di memori.',
    extension: 'Batas jumlah, berat, validasi ID, dan penghitung adalah pengembangan tugas gudang. Pemeriksaan berjalan sebelum cuplikan push ini.',
  },
  pop: {
    document: 'PRAKTIKUM 6 Stack.docx', section: 'Membuat operasi pop',
    lines: ['def pop(self):', '    if self.top is None:', '        return None', '    data = self.top.data', '    self.top = self.top.next', '    return data'],
    meaning: 'Barang keluar karena top berpindah ke next. Data disimpan lebih dahulu agar tetap dapat dikembalikan setelah referensi berubah.',
    extension: 'Penghitung jumlah dan berat diperbarui oleh model gudang setelah perubahan pointer.',
  },
  enqueue: {
    document: 'PRAKTIKUM 7 Queue.docx', section: 'Operasi Enqueue',
    lines: ['def enqueue(self, data):', '    new_node = Node(data)', '    if self.rear is None:', '        self.front = new_node', '        self.rear = new_node', '    else:', '        self.rear.next = new_node', '        self.rear = new_node'],
    meaning: 'Satu pasien mewakili data dalam Node. next menghubungkan urutan pasien; rear menunjuk tempat masuk. Front tetap pada pasien pertama saat Queue sudah berisi.',
    extension: 'Registrasi memilih satu dari tiga Queue berdasarkan prioritas. Cuplikan ini mengatur FIFO di dalam jalur tersebut, bukan memilih prioritas.',
  },
  dequeue: {
    document: 'PRAKTIKUM 7 Queue.docx', section: 'Operasi Dequeue',
    lines: ['def dequeue(self):', '    if self.front is None:', '        return None', '    data = self.front.data', '    self.front = self.front.next', '    if self.front is None:', '        self.rear = None', '    return data'],
    meaning: 'Pasien yang keluar selalu berasal dari front jalur terpilih. Ketika pasien terakhir keluar, rear juga harus menjadi None agar tidak menunjuk node lama.',
    extension: 'Pemanggilan memilih jalur prioritas tertinggi yang berisi, lalu menjalankan dequeue. Loket dan durasi lima menit adalah aturan tambahan simulasi.',
  },
};

const label = data => data === null ? 'None' : typeof data === 'object' ? String(data.id ?? data.name ?? '[objek]') : String(data);

// Record the real assignments; the view never reconstructs an intermediate state from the final result.
export function beginExecution(structure, operation, input = {}) {
  const known = new Map(), locals = { ...input };
  const reference = node => {
    if (!node) return null;
    if (!known.has(node)) known.set(node, `N${known.size + 1}`);
    return known.get(node);
  };
  const execution = { operation, frames: [], implementation: structure[operation].toString() };
  structure.lastExecution = execution;
  return (line, note, updates = {}) => {
    Object.assign(locals, updates);
    const refs = 'top' in structure ? { top: reference(structure.top) } : { front: reference(structure.front), rear: reference(structure.rear) };
    const values = {};
    for (const [name, value] of Object.entries(locals)) {
      if (name === 'new_node') refs[name] = reference(value);
      else values[name] = label(value);
    }
    // Map iteration also visits nodes discovered while following next.
    const nodes = [];
    for (const [node, id] of known) nodes.push({ id, data: label(node.data), next: reference(node.next) });
    execution.frames.push({ line, note, refs, values, nodes });
  };
}
