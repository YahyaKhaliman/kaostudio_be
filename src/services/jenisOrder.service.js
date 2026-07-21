const { pool } = require("../config/database");

const hitungBiayaJasa = ({
    jenisOrder,
    totalJumlahKaos = 1,
    titikCetak = [],
}) => {
    const qty = Math.max(Number(totalJumlahKaos) || 1, 1);

    // Total akumulasi luas area cetak (cm²)
    const totalLuas = titikCetak.reduce(
        (sum, item) =>
            sum + Number(item.panjang || 0) * Number(item.lebar || 0),
        0,
    );

    let hargaPerCm = 0;
    let hargaSatuan = 0; // Biaya jasa per kaos (Rp/pcs)

    switch ((jenisOrder || "").toUpperCase()) {
        case "SD": // Sablon DTF Biasa
            hargaPerCm = 25;
            hargaSatuan = totalLuas * hargaPerCm;
            break;

        case "DP": // DTF Premium
            hargaPerCm = 35;
            hargaSatuan = totalLuas * hargaPerCm;
            break;

        case "BR": // BORDIR
            // 1. Tentukan multiplier harga berdasarkan kuantitas kaos (Tiering Ritel)
            if (qty >= 500) hargaPerCm = 100;
            else if (qty >= 20) hargaPerCm = 500;
            else if (qty >= 11) hargaPerCm = 1000;
            else hargaPerCm = 1500;

            // 2. Hitung harga per kaos (akumulasi tiap titik dengan minimum Rp 5.000 per titik bordir)
            let totalHargaJasaPerKaosBR = 0;
            titikCetak.forEach((t) => {
                const p = Number(t.panjang || 0);
                const l = Number(t.lebar || 0);
                if (p > 0 && l > 0) {
                    const luas = p * l;
                    const hargaKalkulasi = luas * hargaPerCm;
                    // Aturan Minimum: Rp 5.000 per titik lokasi bordir
                    totalHargaJasaPerKaosBR += Math.max(hargaKalkulasi, 5000);
                }
            });

            hargaSatuan = totalHargaJasaPerKaosBR;
            break;

        case "PL": // POLYFLEX
            const isGrosir = qty >= 10;
            let totalHargaJasaPerKaosPL = 0;

            titikCetak.forEach((t) => {
                const p = Number(t.panjang || 0);
                const l = Number(t.lebar || 0);
                if (p > 0 && l > 0) {
                    const luas = p * l;
                    const isGold = (t.warna || "").toUpperCase() === "GOLD";
                    let hCm = isGrosir ? (isGold ? 55 : 40) : isGold ? 65 : 50;
                    totalHargaJasaPerKaosPL += luas * hCm;
                }
            });

            hargaSatuan = totalHargaJasaPerKaosPL;

            // Penentuan hargaPerCm acuan untuk info
            const firstTitikPL = titikCetak.find((t) => t.panjang && t.lebar);
            const isGoldPL =
                (firstTitikPL?.warna || "").toUpperCase() === "GOLD";
            hargaPerCm = isGrosir ? (isGoldPL ? 55 : 40) : isGoldPL ? 65 : 50;
            break;

        case "TG": // DTG (Direct-to-Garment)
            hargaPerCm = 0; // DTG menggunakan harga paket per ukuran cetak & warna kaos
            let totalHargaDTG = 0;
            titikCetak.forEach((t) => {
                const sz = (t.sizeCetak || "").toUpperCase();
                const isWhite =
                    t.isWhiteKaos === true ||
                    (t.warnaKaos || "").toLowerCase() === "#ffffff";
                if (sz === "A5") totalHargaDTG += isWhite ? 15000 : 25000;
                else if (sz === "A4") totalHargaDTG += isWhite ? 25000 : 35000;
                else if (sz === "A3") totalHargaDTG += isWhite ? 35000 : 45000;
            });
            // Diskon 15% jika kuantitas >= 12 pcs
            if (qty >= 12) {
                totalHargaDTG = Math.round(totalHargaDTG * 0.85);
            }
            hargaSatuan = totalHargaDTG;
            break;

        default:
            hargaPerCm = 0;
            hargaSatuan = 0;
            break;
    }

    const totalHargaJasa = qty * hargaSatuan;

    return {
        jenisOrder: (jenisOrder || "").toUpperCase(),
        totalLuas,
        hargaPerCm,
        hargaSatuanJasa: hargaSatuan,
        totalJumlahKaos: qty,
        totalHargaJasa,
    };
};

/**
 * Mengambil daftar biaya tambahan / acuan jasa dari database (tbiayatambahan)
 */
const getBiayaTambahan = async () => {
    try {
        const query = `
            SELECT 
                bt_tambahan AS nama_jasa, 
                bt_harga AS harga_tetap, 
                bt_cm AS tarif_per_cm, 
                bt_min AS minimal_tarif 
            FROM tbiayatambahan
            ORDER BY bt_tambahan
        `;
        const [rows] = await pool.query(query);
        return rows || [];
    } catch (error) {
        console.error("Gagal mengambil data tbiayatambahan:", error.message);
        throw error;
    }
};

module.exports = {
    hitungBiayaJasa,
    getBiayaTambahan,
};
