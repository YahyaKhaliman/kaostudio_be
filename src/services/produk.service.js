const { pool } = require("../config/database");

const getProduk = async () => {
    const query = `
      SELECT
        b.brg_kode,
        TRIM(CONCAT(
          IFNULL(b.brg_jeniskaos, ''), ' ',
          IFNULL(b.brg_tipe, ''), ' ',
          IFNULL(b.brg_lengan, ''), ' ',
          IFNULL(b.brg_jeniskain, ''), ' ',
          IFNULL(b.brg_warna, '')
        )) AS brg_nama,
        b.brg_warna,
        b.brg_jeniskaos,
        b.brg_tipe,
        b.brg_lengan,
        b.brg_jeniskain,
        d.brgd_ukuran,
        d.brgd_harga
      FROM tbarangdc b
      INNER JOIN tbarangdc_dtl d ON b.brg_kode = d.brgd_kode
      WHERE b.brg_ktgp = 'REGULER'
        AND b.brg_jeniskaos IN ('KO', 'KK')
        AND b.brg_tipe = 'POLOS'
        AND b.brg_lengan IN ('PENDEK', 'PANJANG')
        AND b.brg_jeniskain IN ('COMBED 30S', 'COMBED 24S', 'POLO LACOS CVC')
        AND d.brgd_harga > 0
      ORDER BY brg_nama
    `;

    try {
        const [rows] = await pool.query(query);

        // Memetakan produk unik ke dalam map
        const productsMap = {};

        rows.forEach((row) => {
            const code = row.brg_kode;
            
            if (!productsMap[code]) {
                const kain = row.brg_jeniskain ? row.brg_jeniskain.trim().toUpperCase() : "LAINNYA";

                productsMap[code] = {
                    brg_kode: row.brg_kode,
                    brg_nama: row.brg_nama,
                    brg_warna: row.brg_warna,
                    brg_jeniskaos: row.brg_jeniskaos,
                    brg_tipe: row.brg_tipe,
                    brg_lengan: row.brg_lengan,
                    brg_jeniskain: kain,
                    ukuran_list: []
                };
            }

            // Tambahkan ukuran & harga yang valid (> 0) ke dalam array
            productsMap[code].ukuran_list.push({
                ukuran: row.brgd_ukuran,
                harga: Number(row.brgd_harga)
            });
        });

        // Pengelompokan akhir berdasarkan bahan kain utama
        const grouped = {};
        
        Object.values(productsMap).forEach((product) => {
            const kain = product.brg_jeniskain;
            if (!grouped[kain]) {
                grouped[kain] = [];
            }
            grouped[kain].push(product);
        });

        return { items: grouped, total: Object.keys(productsMap).length };
    } catch (error) {
        console.error("Gagal mengambil data produk ter-join dari database:", error.message);
        throw error;
    }
};

const getTarifJasa = async () => {
    const query = `
      SELECT bt_tambahan AS nama_jasa, bt_cm AS tarif_per_cm, bt_min AS minimal_tarif 
      FROM tbiayatambahan
    `;
    const [rows] = await pool.query(query);
    return rows || [];
};

const getWarnaTersedia = async () => {
    const query = `
      SELECT 
        brg_warna,
        brg_jeniskaos,
        brg_lengan,
        brg_jeniskain
      FROM tbarangdc
      WHERE brg_ktgp = 'REGULER'
        AND brg_jeniskaos IN ('KO', 'KK')
        AND brg_tipe = 'POLOS'
        AND brg_lengan IN ('PENDEK', 'PANJANG')
        AND brg_jeniskain IN ('COMBED 30S', 'COMBED 24S', 'POLO LACOS CVC')
        AND brg_warna <> ''
        AND brg_warna NOT LIKE '%STICKER%'
    `;

    try {
        const [rows] = await pool.query(query);

        // Struktur pengelompokan warna per bahan kain dan model
        const mapping = {};

        // Inisialisasi struktur default agar response konsisten
        const bahanList = ["COMBED 30S", "COMBED 24S", "POLO LACOS CVC"];
        bahanList.forEach((b) => {
            mapping[b] = {
                tshirt: [],
                longTshirt: [],
                polo: []
            };
        });

        rows.forEach((row) => {
            const kain = row.brg_jeniskain ? row.brg_jeniskain.trim().toUpperCase() : "LAINNYA";
            
            // Tentukan model pakaian
            let model = "tshirt";
            if (row.brg_jeniskaos === "KK") {
                model = "polo";
            } else if (row.brg_lengan === "PANJANG") {
                model = "longTshirt";
            }

            const warna = row.brg_warna ? row.brg_warna.trim().toUpperCase().replace("#", "") : "";

            if (warna && warna !== "") {
                if (!mapping[kain]) {
                    mapping[kain] = { tshirt: [], longTshirt: [], polo: [] };
                }
                
                // Pastikan hanya memasukkan warna yang unik (tidak ada duplikasi)
                if (!mapping[kain][model].includes(warna)) {
                    mapping[kain][model].push(warna);
                }
            }
        });

        return mapping;
    } catch (error) {
        console.error("Gagal mengambil data warna tersedia dari database:", error.message);
        throw error;
    }
};

const searchProduk = async (term = "") => {
    const query = `
      SELECT 
        a.brg_kode,
        TRIM(CONCAT(
          IFNULL(a.brg_jeniskaos, ''), ' ',
          IFNULL(a.brg_tipe, ''), ' ',
          IFNULL(a.brg_lengan, ''), ' ',
          IFNULL(a.brg_jeniskain, ''), ' ',
          IFNULL(a.brg_warna, '')
        )) AS brg_nama,
        a.brg_warna,
        b.brgd_ukuran,
        b.brgd_harga,
        b.brgd_barcode
      FROM tbarangdc a
      INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
      WHERE a.brg_aktif = 0
        AND LOWER(a.brg_ktgp) IN ('reguler', 'sesional')
        AND (
          a.brg_kode LIKE ? 
          OR a.brg_warna LIKE ? 
          OR a.brg_jeniskaos LIKE ?
          OR a.brg_lengan LIKE ?
          OR a.brg_jeniskain LIKE ?
          OR b.brgd_barcode LIKE ?
          OR TRIM(CONCAT(IFNULL(a.brg_jeniskaos, ''), ' ', IFNULL(a.brg_tipe, ''), ' ', IFNULL(a.brg_lengan, ''), ' ', IFNULL(a.brg_jeniskain, ''), ' ', IFNULL(a.brg_warna, ''))) LIKE ?
        )
      ORDER BY a.brg_kode, b.brgd_ukuran
      LIMIT 50
    `;
    const searchPattern = `%${term}%`;
    try {
        const [rows] = await pool.query(query, [
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
            searchPattern,
        ]);
        return rows || [];
    } catch (error) {
        console.error("Gagal melakukan pencarian produk di database:", error.message);
        throw error;
    }
};

module.exports = {
    getProduk,
    getTarifJasa,
    getWarnaTersedia,
    searchProduk,
};
