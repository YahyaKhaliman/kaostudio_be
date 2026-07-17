const { pool } = require("../config/database");

const calculatePrice = async (params) => {
    const {
        jenisKaos,
        warnaKaos,
        qtyS = 0,
        qtyM = 0,
        qtyL = 0,
        qtyXL = 0,
        qtyXXL = 0,
        qtyXXXL = 0,
        qtyPrintS = 0,
        qtyPrintM = 0,
        qtyPrintL = 0,
        qtyPrintXL = 0,
        qtyPrintXXL = 0,
        qtyPrintXXXL = 0,
        selectedService = "none",
        frontDimensions = { width: 0, height: 0, area: 0 },
        backDimensions = { width: 0, height: 0, area: 0 },
        isPolyflexGold = false,
        kodeKaos = null,
    } = params;

    const totalQty =
        Number(qtyS) +
        Number(qtyM) +
        Number(qtyL) +
        Number(qtyXL) +
        Number(qtyXXL) +
        Number(qtyXXXL);

    const totalPrintQty =
        Number(qtyPrintS) +
        Number(qtyPrintM) +
        Number(qtyPrintL) +
        Number(qtyPrintXL) +
        Number(qtyPrintXXL) +
        Number(qtyPrintXXXL);

    // 1. AMBIL HARGA KAOS DASAR DARI DATABASE
    let shirtPrices = { S: 0, M: 0, L: 0, XL: 0, XXL: 0, XXXL: 0 };
    let activeShirtLabel = "";

    // Tambahkan biaya tambahan warna selain putih (#ffffff)
    const isWhite = (warnaKaos || "").toLowerCase() === "#ffffff";
    const colorCharge = isWhite ? 0 : 5000;
    const colorLabel = isWhite ? "Putih" : "Warna";

    try {
        let dbRows = [];
        if (kodeKaos) {
            const query = `
        SELECT b.brgd_ukuran AS ukuran, b.brgd_harga AS harga, 
               a.brg_warna AS nama_produk
        FROM tbarangdc a
        INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
        WHERE a.brg_kode = ? AND a.brg_aktif = 0
          AND LOWER(a.brg_ktgp) IN ('reguler', 'sesional')
      `;
            const [rows] = await pool.query(query, [kodeKaos]);
            dbRows = rows;
        } else {
            // Cari berdasarkan jenis kaos (tshirt, longTshirt, polo) di kolom brg_warna
            let pattern = "%POLOS PENDEK COMBED 30S%";
            if (jenisKaos === "longTshirt") pattern = "%POLOS PANJANG COMBED%";
            if (jenisKaos === "polo") pattern = "%POLO LACOS%";

            const warnaKeyword = getWarnaKeyword(warnaKaos);

            // Coba dengan filter warna spesifik terlebih dahulu
            if (warnaKeyword) {
                const query = `
          SELECT b.brgd_ukuran AS ukuran, b.brgd_harga AS harga,
                 a.brg_warna AS nama_produk
          FROM tbarangdc a
          INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
          WHERE a.brg_warna LIKE ? AND a.brg_warna LIKE ?
            AND a.brg_aktif = 0
            AND LOWER(a.brg_ktgp) IN ('reguler', 'sesional')
          LIMIT 40
        `;
                const [rows] = await pool.query(query, [
                    pattern,
                    `%${warnaKeyword}%`,
                ]);
                dbRows = rows;
            }

            // Jika tidak ditemukan atau warnaKeyword kosong, fallback ke pencarian umum (warna apa saja)
            if (!dbRows || dbRows.length === 0) {
                const query = `
          SELECT b.brgd_ukuran AS ukuran, b.brgd_harga AS harga,
                 a.brg_warna AS nama_produk
          FROM tbarangdc a
          INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
          WHERE a.brg_warna LIKE ?
            AND a.brg_aktif = 0
            AND LOWER(a.brg_ktgp) IN ('reguler', 'sesional')
          LIMIT 40
        `;
                const [rows] = await pool.query(query, [pattern]);
                dbRows = rows;
            }
        }

        if (dbRows && dbRows.length > 0) {
            activeShirtLabel = dbRows[0].nama_produk;

            // Reset prices ke nilai DB
            dbRows.forEach((row) => {
                let u = row.ukuran.toUpperCase();
                if (u === "2XL") u = "XXL";
                if (u === "3XL") u = "XXXL";

                if (["S", "M", "L", "XL", "XXL", "XXXL"].includes(u)) {
                    shirtPrices[u] = Number(row.harga);
                }
            });
        } else {
            throw new Error("Jenis kaos tersebut tidak ditemukan di database.");
        }
    } catch (e) {
        console.error("Gagal melakukan kueri produk kaos ke DB:", e.message);
        throw e;
    }

    // Terapkan color charge ke harga kaos
    const finalShirtPrices = {
        S: shirtPrices.S + colorCharge,
        M: shirtPrices.M + colorCharge,
        L: shirtPrices.L + colorCharge,
        XL: shirtPrices.XL + colorCharge,
        XXL: shirtPrices.XXL + colorCharge,
        XXXL: shirtPrices.XXXL + colorCharge,
    };

    // 2. AMBIL TARIF JASA DARI DATABASE
    let dbCosts = {};
    try {
        const query = `
      SELECT bt_tambahan AS nama_jasa, bt_cm AS tarif_per_cm, bt_min AS minimal_tarif 
      FROM tbiayatambahan
    `;
        const [rows] = await pool.query(query);
        rows.forEach((r) => {
            dbCosts[r.nama_jasa.toUpperCase()] = {
                cm: Number(r.tarif_per_cm),
                min: Number(r.minimal_tarif),
            };
        });
    } catch (e) {
        console.warn(
            "Gagal mengambil tarif tbiayatambahan dari DB:",
            e.message,
        );
    }

    // 3. HITUNG BIAYA JASA UNIT
    let frontUnit = 0;
    let backUnit = 0;
    const printQty = totalPrintQty || 1;

    if (selectedService !== "none") {
        // A. Sablon DTF (SD)
        if (selectedService === "SD") {
            let costPerCm = 25; // default
            if (dbCosts["DTF"]) costPerCm = dbCosts["DTF"].cm;
            frontUnit = Math.round(frontDimensions.area * costPerCm);
            backUnit = Math.round(backDimensions.area * costPerCm);
        }
        // B. DTF Premium (DP)
        else if (selectedService === "DP") {
            let costPerCm = 35; // default
            if (dbCosts["DTF PREMIUM"]) {
                costPerCm = dbCosts["DTF PREMIUM"].cm;
            } else if (dbCosts["DTF"]) {
                costPerCm = dbCosts["DTF"].cm * 1.4; // Estimasi jika tidak ada tipe premium khusus
            }
            frontUnit = Math.round(frontDimensions.area * costPerCm);
            backUnit = Math.round(backDimensions.area * costPerCm);
        }
        // C. Sablon Plastisol (SB)
        else if (selectedService === "SB") {
            const getPlastisolPrice = (dim) => {
                if (dim.area <= 0) return 0;
                if (dim.area <= 310) return 10000; // A5
                if (dim.area <= 625) return 20000; // A4
                return 35000; // A3
            };
            frontUnit = getPlastisolPrice(frontDimensions);
            backUnit = getPlastisolPrice(backDimensions);
        }
        // D. Bordir (BR)
        else if (selectedService === "BR") {
            let costPerCm = 1500; // default < 11 pcs
            let minCharge = 5000;

            if (dbCosts["BORDIR"]) {
                costPerCm = dbCosts["BORDIR"].cm;
                minCharge = dbCosts["BORDIR"].min || 5000;
            }

            // Tiers diskon berdasarkan kuantitas
            if (printQty >= 500)
                costPerCm = Math.round(costPerCm * 0.067); // ~100
            else if (printQty >= 20)
                costPerCm = Math.round(costPerCm * 0.33); // ~500
            else if (printQty >= 11) costPerCm = Math.round(costPerCm * 0.67); // ~1000

            const getBordirPrice = (dim) => {
                if (dim.area <= 0) return 0;
                return Math.max(Math.round(dim.area * costPerCm), minCharge);
            };
            frontUnit = getBordirPrice(frontDimensions);
            backUnit = getBordirPrice(backDimensions);
        }
        // E. Polyflex (PL)
        else if (selectedService === "PL") {
            const isGrosir = printQty >= 10;
            let costPerCm = isGrosir ? 40 : 50;

            if (dbCosts["POLYFLEX"]) {
                costPerCm = isGrosir
                    ? Math.round(dbCosts["POLYFLEX"].cm * 0.8)
                    : dbCosts["POLYFLEX"].cm;
            }

            if (isPolyflexGold) {
                costPerCm = isGrosir ? 55 : 65;
                if (dbCosts["POLYFLEX GOLD"]) {
                    costPerCm = isGrosir
                        ? dbCosts["POLYFLEX GOLD"].cm * 0.85
                        : dbCosts["POLYFLEX GOLD"].cm;
                }
            }

            frontUnit = Math.round(frontDimensions.area * costPerCm);
            backUnit = Math.round(backDimensions.area * costPerCm);
        }
        // F. DTG (TG)
        else if (selectedService === "TG") {
            const getDtgPrice = (dim) => {
                if (dim.area <= 0) return 0;
                let base = 35000; // default A3 Terang
                if (dim.area <= 310) {
                    base = isWhite ? 15000 : 25000; // A5
                } else if (dim.area <= 625) {
                    base = isWhite ? 25000 : 35000; // A4
                } else {
                    base = isWhite ? 35000 : 45000; // A3
                }

                if (dbCosts["DTG"]) {
                    // Jika ada DTG di DB, sesuaikan base price A3 terang
                    const dbBase = dbCosts["DTG"].cm; // anggap simpan base price
                    if (dbBase > 0) base = Math.round(base * (dbBase / 35000));
                }

                if (printQty >= 12) {
                    base = Math.round(base * 0.85); // Diskon 15%
                }
                return base;
            };
            frontUnit = getDtgPrice(frontDimensions);
            backUnit = getDtgPrice(backDimensions);
        }
    }

    const serviceUnitTotal = frontUnit + backUnit;

    // 4. SUSUN BILLING ROWS (RINCIAN STRUK)
    const list = [];

    // Baris Kaos per ukuran
    const sizes = [
        { name: "S", qty: qtyS },
        { name: "M", qty: qtyM },
        { name: "L", qty: qtyL },
        { name: "XL", qty: qtyXL },
        { name: "XXL", qty: qtyXXL },
        { name: "XXXL", qty: qtyXXXL },
    ];

    sizes.forEach((sz) => {
        if (sz.qty > 0) {
            const price = finalShirtPrices[sz.name];
            list.push({
                type: "kaos",
                nama: `${activeShirtLabel} - Size ${sz.name}`,
                ukuran: sz.name,
                qty: sz.qty,
                harga: price,
                total: sz.qty * price,
            });
        }
    });

    // Baris Jasa Cetak
    if (
        selectedService !== "none" &&
        serviceUnitTotal > 0 &&
        totalPrintQty > 0
    ) {
        const serviceLabel = getServiceLabel(selectedService, isPolyflexGold);

        list.push({
            type: "jasa",
            nama: serviceLabel,
            ukuran: "-",
            qty: totalPrintQty,
            harga: serviceUnitTotal,
            total: totalPrintQty * serviceUnitTotal,
        });
    }

    // Total Akhir
    const subtotal = list.reduce((acc, row) => acc + row.total, 0);

    return {
        activeShirtLabel,
        shirtPrices: finalShirtPrices,
        servicePrices: {
            front: frontUnit,
            back: backUnit,
            total: serviceUnitTotal,
        },
        billingRows: list,
        subtotal,
    };
};

const getServiceLabel = (serviceCode, isPolyflexGold) => {
    const serviceLabels = {
        SD: "Jasa Sablon DTF",
        DP: "Jasa Sablon DTF Premium",
        SB: "Jasa Sablon Plastisol",
        BR: "Jasa Bordir Komputer",
        PL: `Jasa Sablon Polyflex${isPolyflexGold ? " (Gold)" : ""}`,
        TG: "Jasa Sablon DTG (Direct to Garment)",
    };
    return serviceLabels[serviceCode] || "Jasa Cetak Custom";
};

const getWarnaKeyword = (hex) => {
    const h = (hex || "").toLowerCase();
    if (h === "#ffffff") return "PUTIH";
    if (h === "#000000" || h === "#0f172a" || h === "#1e293b") return "HITAM";
    if (h === "#800000" || h === "#7f1d1d" || h === "#b91c1c") return "MARUN";
    if (h === "#000080" || h === "#1e3a8a" || h === "#0f172a") return "NAVY";
    if (h === "#0284c7") return "TURKIS";
    return "";
};

module.exports = {
    calculatePrice,
};
