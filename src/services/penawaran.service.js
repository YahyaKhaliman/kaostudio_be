const { pool } = require("../config/database");

/**
 * @description Format YYYYMMDDHHmmssSSS untuk pen_idrec
 */
const formatTimestampId = (date = new Date()) => {
    const pad = (n, len = 2) => String(n).padStart(len, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    const mss = pad(date.getMilliseconds(), 3);
    return `${yyyy}${mm}${dd}${hh}${mi}${ss}${mss}`;
};

const generateNewOfferNumber = async (connection, cabang = "K01", tanggal) => {
    const tglStr = tanggal || new Date().toISOString().substring(0, 10);
    const yearPart = tglStr.substring(2, 4);
    const monthPart = tglStr.substring(5, 7);
    const datePrefix = yearPart + monthPart;

    const prefix = `${cabang}PEN${datePrefix}`;

    const query = `
      SELECT IFNULL(MAX(CAST(RIGHT(pen_nomor, 4) AS UNSIGNED)), 0) AS maxNum
      FROM tpenawaran_hdr
      WHERE pen_cab = ?
        AND pen_nomor LIKE CONCAT(?, '%')
    `;

    const [rows] = await connection.query(query, [cabang, prefix]);
    const maxNum = parseInt(rows[0]?.maxNum, 10) || 0;
    const nextNum = maxNum + 1;

    if (nextNum > 9999) {
        throw new Error(
            `Nomor penawaran untuk periode ${datePrefix} sudah mencapai maksimum (9999).`,
        );
    }

    return `${prefix}${String(nextNum).padStart(4, "0")}`;
};

/**
 * @description Simpan / Update Penawaran ke tpenawaran_hdr dan tpenawaran_dtl
 */
const savePenawaran = async (payload) => {
    const { header, summary, items, user } = payload || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error("Penawaran harus memiliki minimal 1 item produk.");
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
        const cabang = header?.gudangKode || header?.cabang || "K01";
        const rawUserCode = user?.kode || header?.salesCounter || "OPERATOR";
        const userCode = String(rawUserCode).trim().substring(0, 10);
        const tanggal =
            header?.tanggal || new Date().toISOString().substring(0, 10);
        const customerKode = header?.customerKode || "CUS-GENERAL";
        const customerLevelInt = parseInt(header?.customerLevel, 10) || 0;
        const isNew =
            !header?.nomor ||
            header?.nomor === "<Otomatis>" ||
            header?.nomor.startsWith("PEN-1");

        let nomorPenawaran = header?.nomor;
        let idrec = "";

        if (isNew) {
            nomorPenawaran = await generateNewOfferNumber(
                connection,
                cabang,
                tanggal,
            );
            idrec = `${cabang}PEN${formatTimestampId()}`;

            const insertHeaderQuery = `
              INSERT INTO tpenawaran_hdr 
              (pen_idrec, pen_nomor, pen_tanggal, pen_top, pen_ppn, pen_disc, 
              pen_bkrm, pen_cus_kode, pen_cus_level, pen_ket, pen_cab, user_create, date_create,
              pen_jenis_order_kode, pen_jenis_order_nama, pen_nama_dtf, pen_promo_nomor) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
            `;

            await connection.query(insertHeaderQuery, [
                idrec,
                nomorPenawaran,
                tanggal,
                header?.top || 0,
                header?.ppnPersen || 0,
                summary?.diskonNota || header?.diskonNota || 0,
                summary?.biayaKirim || header?.biayaKirim || 0,
                customerKode,
                customerLevelInt,
                header?.keterangan || "",
                cabang,
                userCode,
                header?.jenisOrderKode || null,
                header?.jenisOrderNama || null,
                header?.namaDtf || null,
                header?.nomorPromo || null,
            ]);
        } else {
            const [idrecRows] = await connection.query(
                "SELECT pen_idrec FROM tpenawaran_hdr WHERE pen_nomor = ?",
                [nomorPenawaran],
            );
            if (idrecRows.length === 0) {
                throw new Error(
                    `Nomor penawaran ${nomorPenawaran} tidak ditemukan.`,
                );
            }
            idrec = idrecRows[0].pen_idrec;

            const updateHeaderQuery = `
              UPDATE tpenawaran_hdr SET
              pen_tanggal = ?, pen_top = ?, pen_ppn = ?, pen_disc = ?, pen_bkrm = ?,
              pen_cus_kode = ?, pen_cus_level = ?, pen_ket = ?, user_modified = ?, date_modified = NOW(),
              pen_jenis_order_kode = ?, pen_jenis_order_nama = ?, pen_nama_dtf = ?, pen_promo_nomor = ?
              WHERE pen_nomor = ?
            `;

            await connection.query(updateHeaderQuery, [
                tanggal,
                header?.top || 0,
                header?.ppnPersen || 0,
                summary?.diskonNota || header?.diskonNota || 0,
                summary?.biayaKirim || header?.biayaKirim || 0,
                customerKode,
                customerLevelInt,
                header?.keterangan || "",
                userCode,
                header?.jenisOrderKode || null,
                header?.jenisOrderNama || null,
                header?.namaDtf || null,
                header?.nomorPromo || null,
                nomorPenawaran,
            ]);
        }

        // Hapus detail lama jika mode update
        await connection.query(
            "DELETE FROM tpenawaran_dtl WHERE pend_nomor = ?",
            [nomorPenawaran],
        );

        // Insert Detail Items
        for (const [index, item] of items.entries()) {
            const isCustom =
                item.sod_custom === "Y" ||
                item.kode === "CUSTOM" ||
                item.isCustomOrder;

            let displayUkuran = item.ukuran || "-";
            if (isCustom && item.sod_custom_data) {
                try {
                    const customData =
                        typeof item.sod_custom_data === "string"
                            ? JSON.parse(item.sod_custom_data)
                            : item.sod_custom_data;

                    if (
                        customData.ukuranKaos &&
                        Array.isArray(customData.ukuranKaos)
                    ) {
                        displayUkuran = [
                            ...new Set(
                                customData.ukuranKaos.map((u) => u.ukuran),
                            ),
                        ].join(",");
                        if (displayUkuran.length > 15)
                            displayUkuran = displayUkuran.substring(0, 15);
                    }
                } catch (e) {
                    console.error("Gagal parse ukuran custom:", e);
                }
            }

            const insertDetailQuery = `
              INSERT INTO tpenawaran_dtl
              (pend_idrec, pend_nomor, pend_kode, pend_ph_nomor, pend_sd_nomor, pend_ukuran, 
              pend_jumlah, pend_harga, pend_disc, pend_diskon, pend_nourut,
              pend_custom, pend_custom_nama, pend_custom_data)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            await connection.query(insertDetailQuery, [
                idrec,
                nomorPenawaran,
                item.kode || "PROD",
                item.noPengajuanHarga || "",
                item.noSoDtf || "",
                displayUkuran,
                Number(item.jumlah || 1),
                Number(item.harga || 0),
                Number(item.diskonPersen || 0),
                Number(item.diskonRp || 0),
                index + 1,
                isCustom ? "Y" : "N",
                isCustom ? item.nama || "Item Custom" : null,
                isCustom && item.sod_custom_data
                    ? typeof item.sod_custom_data === "object"
                        ? JSON.stringify(item.sod_custom_data)
                        : item.sod_custom_data
                    : null,
            ]);
        }

        await connection.commit();

        return {
            success: true,
            nomor: nomorPenawaran,
            idrec: idrec,
            tanggal: tanggal,
            customerNama: header?.customerNama || "Pelanggan",
            grandTotal: summary?.grandTotal || 0,
            totalItems: items.length,
            message: `Penawaran ${nomorPenawaran} berhasil disimpan ke database.`,
        };
    } catch (error) {
        await connection.rollback();
        console.error("Gagal menyimpan penawaran ke database:", error.message);
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    savePenawaran,
    generateNewOfferNumber,
};
