const pool = require("../config/database");

// Data Fallback jika database kosong atau koneksi gagal
const FALLBACK_KAOS = [
  {
    kode: "DEFAULT-TSHIRT",
    nama_produk: "Kaos Polos Cotton Combed 30s Lengan Pendek",
    jenis_kaos: "tshirt",
    tipe: "Lengan Pendek",
    lengan: "Pendek",
    jenis_kain: "Cotton Combed 30s",
    warna: "Putih",
    ukuranHarga: [
      { ukuran: "S", harga: 45000 },
      { ukuran: "M", harga: 45000 },
      { ukuran: "L", harga: 45000 },
      { ukuran: "XL", harga: 45000 },
      { ukuran: "XXL", harga: 50000 },
      { ukuran: "XXXL", harga: 55000 }
    ]
  },
  {
    kode: "DEFAULT-LONG",
    nama_produk: "Kaos Polos Cotton Combed 30s Lengan Panjang",
    jenis_kaos: "longTshirt",
    tipe: "Lengan Panjang",
    lengan: "Panjang",
    jenis_kain: "Cotton Combed 30s",
    warna: "Putih",
    ukuranHarga: [
      { ukuran: "S", harga: 55000 },
      { ukuran: "M", harga: 55000 },
      { ukuran: "L", harga: 55000 },
      { ukuran: "XL", harga: 55000 },
      { ukuran: "XXL", harga: 60000 },
      { ukuran: "XXXL", font: 65000 }
    ]
  },
  {
    kode: "DEFAULT-POLO",
    nama_produk: "Kaos Polo CVC Lacoste",
    jenis_kaos: "polo",
    tipe: "Polo",
    lengan: "Pendek",
    jenis_kain: "CVC Lacoste",
    warna: "Putih",
    ukuranHarga: [
      { ukuran: "S", harga: 65000 },
      { ukuran: "M", harga: 65000 },
      { ukuran: "L", harga: 65000 },
      { ukuran: "XL", harga: 65000 },
      { ukuran: "XXL", harga: 70000 },
      { ukuran: "XXXL", harga: 75000 }
    ]
  }
];

const FALLBACK_JASA = [
  { nama_jasa: "DTF", tarif_per_cm: 10, minimal_tarif: 10000 },
  { nama_jasa: "BORDIR", tarif_per_cm: 12, minimal_tarif: 12000 },
  { nama_jasa: "PLASTISOL", tarif_per_cm: 15, minimal_tarif: 15000 },
  { nama_jasa: "POLYFLEX", tarif_per_cm: 50, minimal_tarif: 0 },
  { nama_jasa: "DTG", tarif_per_cm: 30, minimal_tarif: 15000 }
];

const getProdukKaos = async (req, res) => {
  try {
    const query = `
      SELECT 
          a.brg_kode AS kode,
          TRIM(CONCAT_WS(' ', a.brg_jeniskaos, a.brg_tipe, a.brg_lengan, a.brg_jeniskain)) AS nama_produk,
          a.brg_jeniskaos AS jenis_kaos,
          a.brg_tipe AS tipe,
          a.brg_lengan AS lengan,
          a.brg_jeniskain AS jenis_kain,
          a.brg_warna AS warna,
          b.brgd_ukuran AS ukuran,
          b.brgd_harga AS harga
      FROM tbarangdc a
      INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
      WHERE a.brg_aktif = 0 AND a.brg_logstok = 'Y' AND a.brg_ktg = ""
      ORDER BY nama_produk, b.brgd_barcode;
    `;
    const [rows] = await pool.query(query);

    if (rows.length === 0) {
      return res.json(FALLBACK_KAOS);
    }

    // Melakukan pengelompokan (grouping) berdasarkan kode produk untuk struktur respons yang lebih rapi
    const produkMap = {};
    rows.forEach(row => {
      const { kode, nama_produk, jenis_kaos, tipe, lengan, jenis_kain, warna, ukuran, harga } = row;
      if (!produkMap[kode]) {
        produkMap[kode] = {
          kode,
          nama_produk,
          jenis_kaos: jenis_kaos?.toLowerCase() || "tshirt",
          tipe,
          lengan,
          jenis_kain,
          warna,
          ukuranHarga: []
        };
      }
      produkMap[kode].ukuranHarga.push({ ukuran, harga });
    });

    res.json(Object.values(produkMap));
  } catch (error) {
    console.warn("Gagal mengambil data produk kaos dari DB, menggunakan data fallback:", error.message);
    res.json(FALLBACK_KAOS);
  }
};

const getTarifJasa = async (req, res) => {
  try {
    const query = `
      SELECT bt_tambahan AS nama_jasa, bt_cm AS tarif_per_cm, bt_min AS minimal_tarif 
      FROM tbiayatambahan
    `;
    const [rows] = await pool.query(query);

    if (rows.length === 0) {
      return res.json(FALLBACK_JASA);
    }

    // Normalisasi format response
    const dataJasa = rows.map(r => ({
      nama_jasa: r.nama_jasa.toUpperCase(),
      tarif_per_cm: Number(r.tarif_per_cm),
      minimal_tarif: Number(r.minimal_tarif)
    }));

    res.json(dataJasa);
  } catch (error) {
    console.warn("Gagal mengambil data tarif jasa dari DB, menggunakan data fallback:", error.message);
    res.json(FALLBACK_JASA);
  }
};

module.exports = {
  getProdukKaos,
  getTarifJasa,
  FALLBACK_KAOS,
  FALLBACK_JASA
};
