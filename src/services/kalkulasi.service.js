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
        frontService = null,
        backService = null,
        designItems = null,
        frontDimensions = { width: 0, height: 0, area: 0 },
        backDimensions = { width: 0, height: 0, area: 0 },
        isPolyflexGold = false,
        kodeKaos = null,
    } = params;

    const effectiveFrontService = frontService || selectedService;
    const effectiveBackService = backService || selectedService;

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

    const isWhite = (warnaKaos || "").toLowerCase() === "#ffffff" || (warnaKaos || "").toLowerCase() === "putih";
    const colorCharge = isWhite ? 0 : 5000;

    try {
        let dbRows = [];
        if (kodeKaos) {
            const query = `
        SELECT b.brgd_ukuran AS ukuran, b.brgd_harga AS harga, 
               a.brg_warna AS nama_produk, a.brg_kode
        FROM tbarangdc a
        INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
        WHERE a.brg_kode = ? AND a.brg_aktif = 0
          AND LOWER(a.brg_ktgp) IN ('reguler', 'sesional')
          AND b.brgd_harga > 0
      `;
            const [rows] = await pool.query(query, [kodeKaos]);
            dbRows = rows;
        }

        if (!dbRows || dbRows.length === 0) {
            let jeniskaosCond = "a.brg_jeniskaos = 'KO'";
            let lenganCond = "a.brg_lengan = 'PENDEK'";

            if (jenisKaos === "longTshirt") {
                jeniskaosCond = "a.brg_jeniskaos = 'KO'";
                lenganCond = "a.brg_lengan = 'PANJANG'";
            } else if (jenisKaos === "polo") {
                jeniskaosCond = "a.brg_jeniskaos = 'KK'";
                lenganCond = "1=1";
            }

            const cleanColor = (warnaKaos || "")
                .replace("#", "")
                .replace("HEX", "")
                .trim();

            const query = `
        SELECT b.brgd_ukuran AS ukuran, b.brgd_harga AS harga,
               a.brg_warna AS nama_produk, a.brg_kode
        FROM tbarangdc a
        INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
        WHERE ${jeniskaosCond} AND ${lenganCond}
          AND a.brg_aktif = 0
          AND LOWER(a.brg_ktgp) IN ('reguler', 'sesional')
          AND b.brgd_harga > 0
          ${cleanColor ? "AND (a.brg_warna LIKE ? OR a.brg_kode LIKE ?)" : ""}
        ORDER BY a.brg_kode, b.brgd_ukuran
        LIMIT 40
      `;
            const queryParams = cleanColor ? [`%${cleanColor}%`, `%${cleanColor}%`] : [];
            const [rows] = await pool.query(query, queryParams);
            dbRows = rows;
        }

        // FALLBACK: Jika pencarian warna spesifik tidak menghasilkan baris,
        // cari produk default berdasarkan model kaos & lengan saja
        if (!dbRows || dbRows.length === 0) {
            let jeniskaosCond = "a.brg_jeniskaos = 'KO'";
            let lenganCond = "a.brg_lengan = 'PENDEK'";
            if (jenisKaos === "longTshirt") {
                jeniskaosCond = "a.brg_jeniskaos = 'KO'";
                lenganCond = "a.brg_lengan = 'PANJANG'";
            } else if (jenisKaos === "polo") {
                jeniskaosCond = "a.brg_jeniskaos = 'KK'";
                lenganCond = "1=1";
            }

            const fallbackQuery = `
        SELECT b.brgd_ukuran AS ukuran, b.brgd_harga AS harga,
               a.brg_warna AS nama_produk, a.brg_kode
        FROM tbarangdc a
        INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
        WHERE ${jeniskaosCond} AND ${lenganCond}
          AND a.brg_aktif = 0
          AND LOWER(a.brg_ktgp) IN ('reguler', 'sesional')
          AND b.brgd_harga > 0
        ORDER BY a.brg_kode, b.brgd_ukuran
        LIMIT 40
      `;
            const [fallbackRows] = await pool.query(fallbackQuery);
            dbRows = fallbackRows;
        }

        if (dbRows && dbRows.length > 0) {
            activeShirtLabel = dbRows[0].nama_produk;

            dbRows.forEach((row) => {
                let u = row.ukuran.toUpperCase();
                if (u === "2XL") u = "XXL";
                if (u === "3XL") u = "XXXL";

                if (["S", "M", "L", "XL", "XXL", "XXXL"].includes(u)) {
                    shirtPrices[u] = Number(row.harga);
                }
            });
        } else {
            // Default fallback harga dasar standar jika tabel tbarangdc sedang kosong
            shirtPrices = { S: 40000, M: 40000, L: 40000, XL: 40000, XXL: 46500, XXXL: 53000 };
            activeShirtLabel = "KAOS POLOS COMBED 30S";
        }
    } catch (e) {
        console.error("Gagal melakukan kueri produk kaos ke DB:", e.message);
        shirtPrices = { S: 40000, M: 40000, L: 40000, XL: 40000, XXL: 46500, XXXL: 53000 };
        activeShirtLabel = "KAOS POLOS COMBED 30S";
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

    // 3. HITUNG BIAYA JASA UNIT PER DESAIN / SISI
    const printQty = totalPrintQty || 1;

    const calcSingleSideService = (serviceCode, dimensions) => {
        if (!serviceCode || serviceCode === "none" || !dimensions || Number(dimensions.area) <= 0) {
            return 0;
        }
        const area = Number(dimensions.area);
        if (serviceCode === "SD") {
            let costPerCm = 25;
            if (dbCosts["DTF"]) costPerCm = dbCosts["DTF"].cm;
            return Math.round(area * costPerCm);
        }
        if (serviceCode === "DP") {
            let costPerCm = 35;
            if (dbCosts["DTF PREMIUM"]) {
                costPerCm = dbCosts["DTF PREMIUM"].cm;
            } else if (dbCosts["DTF"]) {
                costPerCm = dbCosts["DTF"].cm * 1.4;
            }
            return Math.round(area * costPerCm);
        }
        if (serviceCode === "SB") {
            if (area <= 310) return 10000;
            if (area <= 625) return 20000;
            return 35000;
        }
        if (serviceCode === "BR") {
            let costPerCm = 1500;
            let minCharge = 5000;
            if (dbCosts["BORDIR"]) {
                costPerCm = dbCosts["BORDIR"].cm;
                minCharge = dbCosts["BORDIR"].min || 5000;
            }
            if (printQty >= 500) costPerCm = Math.round(costPerCm * 0.067);
            else if (printQty >= 20) costPerCm = Math.round(costPerCm * 0.33);
            else if (printQty >= 11) costPerCm = Math.round(costPerCm * 0.67);

            return Math.max(Math.round(area * costPerCm), minCharge);
        }
        if (serviceCode === "PL") {
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
            return Math.round(area * costPerCm);
        }
        if (serviceCode === "TG") {
            let base = 35000;
            if (area <= 310) {
                base = isWhite ? 15000 : 25000;
            } else if (area <= 625) {
                base = isWhite ? 25000 : 35000;
            } else {
                base = isWhite ? 35000 : 45000;
            }
            if (dbCosts["DTG"]) {
                const dbBase = dbCosts["DTG"].cm;
                if (dbBase > 0) base = Math.round(base * (dbBase / 35000));
            }
            if (printQty >= 12) {
                base = Math.round(base * 0.85);
            }
            return base;
        }
        return 0;
    };

    let frontUnit = 0;
    let backUnit = 0;
    let serviceUnitTotal = 0;
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
                kode: kodeKaos || "KAOS",
                nama: `${activeShirtLabel} - Size ${sz.name}`,
                kategori: "REGULER",
                ukuran: sz.name,
                qty: sz.qty,
                harga: price,
                total: sz.qty * price,
                isCustomOrder: false,
                sod_custom: "N",
            });
        }
    });

    // Baris Jasa Cetak (Jika dikirim array designItems terpisah)
    if (Array.isArray(designItems) && designItems.length > 0 && totalPrintQty > 0) {
        designItems.forEach((item) => {
            const svc = item.service || "SD";
            if (svc !== "none") {
                const unitPrice = calcSingleSideService(svc, item);
                if (unitPrice > 0) {
                    const labelSvc = getServiceLabel(svc, isPolyflexGold);
                    const posLabel = item.side === "front" ? "Depan" : "Belakang";
                    const itemNama = `${labelSvc} - ${item.label || "Desain"} (${posLabel})`;
                    const itemUkuran = getStandardDesignSize(item.width, item.height, item.area);

                    if (item.side === "front") frontUnit += unitPrice;
                    else backUnit += unitPrice;

                    const customDataObj = {
                        titikCetak: [
                            {
                                keterangan: item.label || "Desain",
                                sizeCetak: itemUkuran,
                                panjang: item.width || 0,
                                lebar: item.height || 0,
                                service: svc,
                            },
                        ],
                        hargaPerCm: svc === "DP" ? 35 : 25,
                    };

                    list.push({
                        type: "jasa",
                        kode: `CUSTOM-${svc}`,
                        nama: itemNama,
                        kategori: "CUSTOM",
                        ukuran: itemUkuran,
                        qty: totalPrintQty,
                        harga: unitPrice,
                        total: totalPrintQty * unitPrice,
                        isCustomOrder: true,
                        sod_custom: "Y",
                        sod_custom_nama: itemNama,
                        sod_custom_data: JSON.stringify(customDataObj),
                    });
                }
            }
        });
        serviceUnitTotal = frontUnit + backUnit;
    } else if (totalPrintQty > 0) {
        // Fallback per-sisi Depan & Belakang
        frontUnit = calcSingleSideService(effectiveFrontService, frontDimensions);
        backUnit = calcSingleSideService(effectiveBackService, backDimensions);
        serviceUnitTotal = frontUnit + backUnit;

        if (effectiveFrontService !== "none" && frontUnit > 0) {
            const frontLabel = getServiceLabel(effectiveFrontService, isPolyflexGold);
            const frontUkuran = getStandardDesignSize(frontDimensions.width, frontDimensions.height, frontDimensions.area);
            const frontCustomData = {
                titikCetak: [
                    {
                        keterangan: "Sisi Depan",
                        sizeCetak: frontUkuran,
                        panjang: frontDimensions.width || 0,
                        lebar: frontDimensions.height || 0,
                        service: effectiveFrontService,
                    },
                ],
                hargaPerCm: effectiveFrontService === "DP" ? 35 : 25,
            };

            list.push({
                type: "jasa",
                kode: `CUSTOM-${effectiveFrontService}`,
                nama: `${frontLabel} (Depan)`,
                kategori: "CUSTOM",
                ukuran: frontUkuran,
                qty: totalPrintQty,
                harga: frontUnit,
                total: totalPrintQty * frontUnit,
                isCustomOrder: true,
                sod_custom: "Y",
                sod_custom_nama: `${frontLabel} (Depan)`,
                sod_custom_data: JSON.stringify(frontCustomData),
            });
        }

        if (effectiveBackService !== "none" && backUnit > 0) {
            const backLabel = getServiceLabel(effectiveBackService, isPolyflexGold);
            const backUkuran = getStandardDesignSize(backDimensions.width, backDimensions.height, backDimensions.area);
            const backCustomData = {
                titikCetak: [
                    {
                        keterangan: "Sisi Belakang",
                        sizeCetak: backUkuran,
                        panjang: backDimensions.width || 0,
                        lebar: backDimensions.height || 0,
                        service: effectiveBackService,
                    },
                ],
                hargaPerCm: effectiveBackService === "DP" ? 35 : 25,
            };

            list.push({
                type: "jasa",
                kode: `CUSTOM-${effectiveBackService}`,
                nama: `${backLabel} (Belakang)`,
                kategori: "CUSTOM",
                ukuran: backUkuran,
                qty: totalPrintQty,
                harga: backUnit,
                total: totalPrintQty * backUnit,
                isCustomOrder: true,
                sod_custom: "Y",
                sod_custom_nama: `${backLabel} (Belakang)`,
                sod_custom_data: JSON.stringify(backCustomData),
            });
        }
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
        SD: "Jasa DTF Standart",
        DP: "Jasa DTF Premium",
        SB: "Jasa Sablon Plastisol",
        BR: "Jasa Bordir",
        PL: `Jasa Sablon Polyflex${isPolyflexGold ? " (Gold)" : ""}`,
        TG: "Jasa DTG",
    };
    return serviceLabels[serviceCode] || "Jasa Cetak Custom";
};

const getStandardDesignSize = (width, height, area) => {
    const w = Number(width || 0);
    const h = Number(height || 0);
    const a = Number(area || 0);

    if (w <= 0 || h <= 0 || a <= 0) return "-";

    // Logo (10x10 cm ± 2.5cm)
    if (Math.abs(w - 10) <= 2.5 && Math.abs(h - 10) <= 2.5) {
        return "Logo";
    }

    // A5 (14.8 x 21.0 cm ± 2.5cm)
    if (
        (Math.abs(w - 14.8) <= 2.5 && Math.abs(h - 21.0) <= 2.5) ||
        (Math.abs(w - 21.0) <= 2.5 && Math.abs(h - 14.8) <= 2.5)
    ) {
        return "A5";
    }

    // A4 (21.0 x 29.7 cm ± 2.5cm)
    if (
        (Math.abs(w - 21.0) <= 2.5 && Math.abs(h - 29.7) <= 2.5) ||
        (Math.abs(w - 29.7) <= 2.5 && Math.abs(h - 21.0) <= 2.5)
    ) {
        return "A4";
    }

    // A3 (29.7 x 42.0 cm ± 2.5cm)
    if (
        (Math.abs(w - 29.7) <= 2.5 && Math.abs(h - 42.0) <= 2.5) ||
        (Math.abs(w - 42.0) <= 2.5 && Math.abs(h - 29.7) <= 2.5)
    ) {
        return "A3";
    }

    // Ukuran non-standar dengan kombinasi dimensi (misal: Custom (20.6 × 20.6))
    return `Custom (${w} × ${h})`;
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
