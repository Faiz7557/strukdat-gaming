const data=id=>({id,name:`Data ${id}`,weight:1});

function questions(kind) {
  const stack=kind==='stack',add=stack?'push':'enqueue',remove=stack?'pop':'dequeue',pointer=stack?'top':'front';
  return [
    {
      title:'Tambahkan satu data', initial:['A','B'],
      prompt:`A masuk lebih dulu, lalu B. Tambahkan C ${stack?'ke atas tumpukan':'ke belakang antrean'}. Operasi mana yang tepat?`,
      choices:[['add',`Tambah C / ${add}(C)`],['remove',`Ambil / ${remove}()`],['peek','Lihat / peek()']], answer:'add',
      hint:'Pilih operasi yang menambah data; mengambil atau melihat tidak menambah C.',
      run:s=>s[add](data('C')),
      explanation:stack?'push(C) menaruh C di top. Urutannya kini C → B → A dari top.':'enqueue(C) menaruh C di rear. Front tetap A; urutannya A → B → C.',
    },
    {
      title:'Amati urutan keluar', initial:['A','B','C'],
      prompt:`A masuk, lalu B, lalu C. Jika ${remove}() dijalankan, data mana yang keluar?`,
      choices:[['A','A'],['B','B'],['C','C']], answer:stack?'C':'A',
      hint:`Amati ${pointer} dan aturan ${stack?'terakhir masuk, pertama keluar':'pertama masuk, pertama keluar'}.`,
      run:s=>s[remove](),
      explanation:`${stack?'C':'A'} keluar lewat ${pointer}. ${stack?'Top':'Front'} sekarang B; tersisa dua data.`,
    },
    {
      title:'Lihat tanpa mengambil', initial:stack?['A','B']:['B','C'],
      prompt:`${stack?'Top':'Front'} menunjuk B. Lihat datanya tanpa menghapus. Operasi mana yang tepat?`,
      choices:[['remove',`Ambil / ${remove}()`],['peek','Lihat / peek()'],['empty','Cek kosong / isEmpty()']], answer:'peek',
      hint:'Ambil menghapus data, sedangkan cek kosong hanya memberi True/False. Pilih operasi yang membaca data.',
      run:s=>s.peek(), explanation:'peek() menghasilkan B; jumlah data tetap 2. Data dibaca tanpa dihapus.',
    },
    {
      title:'Periksa struktur yang berisi', initial:['A','B'],
      prompt:'Masih ada dua data. Apa hasil isEmpty()?',
      choices:[['True','True'],['False','False'],['None','None']], answer:'False',
      hint:'isEmpty() menanyakan apakah tidak ada data, bukan apakah ada data.',
      run:s=>s.isEmpty(), explanation:'isEmpty() menghasilkan False karena struktur masih berisi A dan B. Tidak ada data yang dihapus.',
    },
    {
      title:'Kenali kondisi kosong', initial:[],
      prompt:`Tidak ada data dan ${pointer} menunjuk None. Apa hasil isEmpty()?`,
      choices:[['False','False'],['None','None'],['True','True']], answer:'True',
      hint:'True berarti pernyataan “struktur ini kosong” benar. None berarti tidak ada node yang ditunjuk.',
      run:s=>s.isEmpty(), explanation:'isEmpty() menghasilkan True. Struktur tetap kosong; pemeriksaan ini tidak menambah atau menghapus node.',
    },
    {
      title:'Ambil data terakhir', initial:['K'],
      prompt:`Hanya K yang tersisa. Setelah ${remove}(), bagaimana referensi ${stack?'top':'front dan rear'}?`,
      choices:[['K','Tetap menunjuk K'],['None',stack?'top → None':'front dan rear → None'],['new','Membuat node pengganti']], answer:'None',
      hint:`Setelah node terakhir keluar, tidak ada lagi node yang dapat ditunjuk ${stack?'top':'kedua ujung Queue'}.`,
      run:s=>s[remove](), explanation:stack?'K keluar. Top menjadi None dan jumlah data menjadi 0.':'K keluar. Front dan rear sama-sama menjadi None agar tidak ada referensi yang tertinggal ke node lama.',
    },
    {
      title:'Mengambil dari struktur kosong', initial:[],
      prompt:`Struktur sudah kosong. Apa yang dikembalikan ${remove}()?`,
      choices:[['0','Angka 0'],['None','None'],['new','Data baru']], answer:'None',
      hint:'Tidak ada data yang bisa dikembalikan. Angka 0 bisa menjadi nilai data, sehingga berbeda dari penanda tidak ada hasil.',
      run:s=>s[remove](), explanation:`${remove}() menghasilkan None tanpa mengubah struktur. Kondisi ini disebut underflow.`,
    },
    {
      title:'Gabungkan tambah dan ambil', initial:stack?['A','C']:['B','C'],
      prompt:`Skenario baru: A dan B dimasukkan, lalu ${remove}() sekali, lalu ${add}(C). Diagram menunjukkan hasilnya. Jika ${remove}() lagi, siapa yang keluar?`,
      choices:[['A','A'],['C','C'],['B','B']], answer:stack?'C':'B',
      hint:`Lanjutkan dari diagram saat ini. Data baru ${stack?'menjadi top pada Stack':'masuk di rear, bukan mendahului front pada Queue'}.`,
      run:s=>s[remove](), explanation:stack?'C keluar. Setelah B diambil dan C ditambahkan, C menjadi top di atas A.':'B keluar. Setelah A keluar, B menjadi front; C ditambahkan di belakang B.',
    },
    {
      title:stack?'Ikuti perpindahan top':'Rear tetap di belakang', initial:['A','B','C'],
      prompt:stack?'A, B, C masuk berurutan. Setelah pop() mengambil C, top menunjuk siapa?':'A, B, C masuk berurutan. Setelah dequeue() mengambil A, rear menunjuk siapa?',
      choices:[['B','B'],['A','A'],['C','C']], answer:stack?'B':'C',
      hint:stack?'Top berpindah ke next milik node yang diambil.':'Dequeue memindahkan front. Rear berubah menjadi None hanya jika tidak ada lagi node.',
      run:s=>s[remove](), explanation:stack?'Top berpindah dari C ke B. Referensi next milik B tetap menunjuk A.':'Front berpindah dari A ke B. Rear tetap menunjuk C karena Queue masih berisi B dan C.',
    },
    {
      title:'Dua kali mengambil', initial:['A','B','C'],
      prompt:`A, B, C masuk berurutan. Jika ${remove}() dijalankan dua kali, bagaimana urutan data yang keluar?`,
      choices:[['B,A','B → A'],['C,B','C → B'],['A,B','A → B']], answer:stack?'C,B':'A,B',
      hint:`Terapkan ${stack?'LIFO':'FIFO'} pada pengambilan pertama, lalu amati ujung yang baru sebelum pengambilan kedua.`,
      run:s=>[s[remove](),s[remove]()], explanation:stack?'C keluar, lalu B. A tersisa sebagai top: urutan keluar mengikuti LIFO.':'A keluar, lalu B. C tersisa sebagai front sekaligus rear: urutan keluar mengikuti FIFO.',
    },
  ];
}

export const warmupQuestions={stack:questions('stack'),queue:questions('queue')};
