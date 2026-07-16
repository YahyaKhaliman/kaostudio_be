const pool = require("../config/database");

const calculatePrice = async (req, res) => {
  try {
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
      kodeKaos = null // Opsional, jika frontend mengirim kode spesifik dari DB
    } = req.body;

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

    // 1. AMBIL HARGA KAOS DASAR DARI DATABASE (ATAU FALLBACK)
    let shirtPrices = { S: 45000, M: 45000, L: 45000, XL: 45000, XXL: 50000, XXXL: 55000 };
    let activeShirtLabel = "Pakaian Polos";

    // Tambahkan biaya tambahan warna selain putih (#ffffff)
    const isWhite = (warnaKaos || "").toLowerCase() === "#ffffff";
    const colorCharge = isWhite ? 0 : 5000;
    const colorLabel = isWhite ? "Putih" : "Warna";

    try {
      let dbRows = [];
      if (kodeKaos) {
        const [rows] = await pool.query(
          `SELECT b.brgd_ukuran AS ukuran, b.brgd_harga AS harga, 
                  TRIM(CONCAT_WS(' ', a.brg_jeniskaos, a.brg_tipe, a.brg_lengan, a.brg_jeniskain)) AS nama_produk
           FROM tbarangdc a
           INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
           WHERE a.brg_kode = ? AND a.brg_aktif = 0`,
          [kodeKaos]
        );
        dbRows = rows;
      } else {
        // Cari berdasarkan jenis kaos (tshirt, longTshirt, polo)
        let pattern = "%Combed 30s%Lengan Pendek%";
        if (jenisKaos === "longTshirt") pattern = "%Combed 30s%Lengan Panjang%";
        if (jenisKaos === "polo") pattern = "%Polo CVC%";

        const [rows] = await pool.query(
          `SELECT b.brgd_ukuran AS ukuran, b.brgd_harga AS harga,
                  TRIM(CONCAT_WS(' ', a.brg_jeniskaos, a.brg_tipe, a.brg_lengan, a.brg_jeniskain)) AS nama_produk
           FROM tbarangdc a
           INNER JOIN tbarangdc_dtl b ON a.brg_kode = b.brgd_kode
           WHERE TRIM(CONCAT_WS(' ', a.brg_jeniskaos, a.brg_tipe, a.brg_lengan, a.brg_jeniskain)) LIKE ?
             AND a.brg_aktif = 0
           LIMIT 20`,
          [pattern]
        );
        dbRows = rows;
      }

      if (dbRows.length > 0) {
        activeShirtLabel = `${dbRows[0].nama_produk} (${colorLabel})`;
        // Reset prices ke nilai DB
        dbRows.forEach(row => {
          const u = row.ukuran.toUpperCase();
          if (["S", "M", "L", "XL", "XXL", "XXXL"].includes(u)) {
            shirtPrices[u] = Number(row.harga);
          }
        });
      } else {
        // Fallback label berdasarkan jenis
        if (jenisKaos === "tshirt") {
          activeShirtLabel = `Kaos Polos Cotton Combed 30s Lengan Pendek (${colorLabel})`;
          shirtPrices = { S: 45000, M: 45000, L: 45000, XL: 45000, XXL: 50000, XXXL: 55000 };
        } else if (jenisKaos === "longTshirt") {
          activeShirtLabel = `Kaos Polos Cotton Combed 30s Lengan Panjang (${colorLabel})`;
          shirtPrices = { S: 55000, M: 55000, L: 55000, XL: 55000, XXL: 60000, XXXL: 65000 };
        } else if (jenisKaos === "polo") {
          activeShirtLabel = `Kaos Polo CVC Lacoste (${colorLabel})`;
          shirtPrices = { S: 65000, M: 65000, L: 65000, XL: 65000, XXL: 70000, XXXL: 75000 };
        }
      }
    } catch (e) {
      console.warn("Kalkulasi menggunakan fallback harga kaos dasar karena DB error:", e.message);
      // Fallback manual
      if (jenisKaos === "tshirt") {
        activeShirtLabel = `Kaos Polos Cotton Combed 30s Lengan Pendek (${colorLabel})`;
        shirtPrices = { S: 45000, M: 45000, L: 45000, XL: 45000, XXL: 50000, XXXL: 55000 };
      } else if (jenisKaos === "longTshirt") {
        activeShirtLabel = `Kaos Polos Cotton Combed 30s Lengan Panjang (${colorLabel})`;
        shirtPrices = { S: 55000, M: 55000, L: 55000, XL: 55000, XXL: 60000, XXXL: 65000 };
      } else if (jenisKaos === "polo") {
        activeShirtLabel = `Kaos Polo CVC Lacoste (${colorLabel})`;
        shirtPrices = { S: 65000, M: 65000, L: 65000, XL: 65000, XXL: 70000, XXXL: 75000 };
      }
    }

    // Terapkan color charge ke harga kaos
    const finalShirtPrices = {
      S: shirtPrices.S + colorCharge,
      M: shirtPrices.M + colorCharge,
      L: shirtPrices.L + colorCharge,
      XL: shirtPrices.XL + colorCharge,
      XXL: shirtPrices.XXL + colorCharge,
      XXXL: shirtPrices.XXXL + colorCharge
    };

    // 2. AMBIL TARIF JASA DARI DATABASE
    let dbCosts = {};
    try {
      const [rows] = await pool.query(
        "SELECT bt_tambahan, bt_cm, bt_min FROM tbiayatambahan"
      );
      rows.forEach(r => {
        dbCosts[r.bt_tambahan.toUpperCase()] = {
          cm: Number(r.bt_cm),
          min: Number(r.bt_min)
        };
      });
    } catch (e) {
      console.warn("Gagal mengambil tarif tbiayatambahan dari DB:", e.message);
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
        if (dbCosts["DTF PREMIUM"]) costPerCm = dbCosts["DTF PREMIUM"].cm;
        else if (dbCosts["DTF"]) costPerCm = dbCosts["DTF"].cm * 1.4; // Estimasi jika tidak ada tipe premium khusus
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
        if (printQty >= 500) costPerCm = Math.round(costPerCm * 0.067); // ~100
        else if (printQty >= 20) costPerCm = Math.round(costPerCm * 0.33); // ~500
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
            costPerCm = isGrosir ? dbCosts["POLYFLEX GOLD"].cm * 0.85 : dbCosts["POLYFLEX GOLD"].cm;
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
      { name: "XXXL", qty: qtyXXXL }
    ];

    sizes.forEach(sz => {
      if (sz.qty > 0) {
        const price = finalShirtPrices[sz.name];
        list.push({
          type: "kaos",
          nama: `${activeShirtLabel} - Size ${sz.name}`,
          qty: sz.qty,
          harga: price,
          total: sz.qty * price
        });
      }
    });

    // Baris Jasa Cetak
    if (selectedService !== "none" && serviceUnitTotal > 0 && totalPrintQty > 0) {
      let serviceLabel = "Jasa Cetak Custom";
      if (selectedService === "SD") serviceLabel = "Jasa Sablon DTF";
      if (selectedService === "DP") serviceLabel = "Jasa Sablon DTF Premium";
      if (selectedService === "SB") serviceLabel = "Jasa Sablon Plastisol";
      if (selectedService === "BR") serviceLabel = "Jasa Bordir Komputer";
      if (selectedService === "PL") serviceLabel = `Jasa Sablon Polyflex${isPolyflexGold ? " (Gold)" : ""}`;
      if (selectedService === "TG") serviceLabel = "Jasa Sablon DTG (Direct to Garment)";

      list.push({
        type: "jasa",
        nama: serviceLabel,
        qty: totalPrintQty,
        harga: serviceUnitTotal,
        total: totalPrintQty * serviceUnitTotal
      });
    }

    // Total Akhir
    const subtotal = list.reduce((acc, row) => acc + row.total, 0);

    res.json({
      activeShirtLabel,
      shirtPrices: finalShirtPrices,
      servicePrices: {
        front: frontUnit,
        back: backUnit,
        total: serviceUnitTotal
      },
      billingRows: list,
      subtotal
    });
  } catch (error) {
    console.error("Kesalahan kalkulasi harga:", error);
    res.status(500).json({ message: "Gagal menghitung estimasi harga." });
  }
};

module.exports = {
  calculatePrice
};
