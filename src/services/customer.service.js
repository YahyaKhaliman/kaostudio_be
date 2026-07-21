const { pool } = require("../config/database");

const searchCustomers = async (term = "", limit = 20) => {
    const cleanTerm = (term || "").trim();
    const searchTerm = `%${cleanTerm}%`;
    const cleanPhoneTerm = `%${cleanTerm.replace(/[\s-]/g, "")}%`;

    let whereSql = "WHERE c.cus_aktif = 0";
    const params = [];

    if (cleanTerm) {
        whereSql += ` AND (
            c.cus_kode LIKE ? 
            OR c.cus_nama LIKE ? 
            OR REPLACE(REPLACE(c.cus_telp, ' ', ''), '-', '') LIKE ?
        )`;
        params.push(searchTerm, searchTerm, cleanPhoneTerm);
    }

    const query = `
        SELECT 
            c.cus_kode AS kode,
            c.cus_nama AS nama,
            c.cus_alamat AS alamat,
            c.cus_kota AS kota,
            c.cus_telp AS telp,
            c.cus_nama_kontak AS namaKontak,
            c.cus_tgllahir AS tglLahir,
            c.cus_top AS top,
            IF(c.cus_aktif = 0, 'AKTIF', 'PASIF') AS status,
            c.cus_npwp AS npwp,
            c.cus_nama_npwp AS namaNpwp,
            c.cus_alamat_npwp AS alamatNpwp,
            c.cus_kota_npwp AS kotaNpwp,
            c.cus_limit AS limitTrans,
            (
                SELECT lvl.level_nama 
                FROM tcustomer_level_history h 
                LEFT JOIN tcustomer_level lvl ON h.clh_level = lvl.level_kode
                WHERE h.clh_cus_kode = c.cus_kode 
                ORDER BY h.clh_tanggal DESC 
                LIMIT 1
            ) AS levelNama,
            (
                SELECT h.clh_level 
                FROM tcustomer_level_history h 
                WHERE h.clh_cus_kode = c.cus_kode 
                ORDER BY h.clh_tanggal DESC 
                LIMIT 1
            ) AS levelKode
        FROM tcustomer c
        ${whereSql}
        ORDER BY c.cus_nama ASC
        LIMIT ?
    `;

    const countQuery = `SELECT COUNT(*) AS total FROM tcustomer c ${whereSql}`;
    const queryParams = [...params];

    params.push(Number(limit) || 20);

    try {
        const [rows] = await pool.query(query, params);
        const [totalRows] = await pool.query(countQuery, queryParams);
        return {
            items: rows,
            total: totalRows && totalRows[0] ? totalRows[0].total : 0,
        };
    } catch (error) {
        console.error(
            "Gagal melakukan pencarian customer di DB:",
            error.message,
        );
        throw error;
    }
};

const getCustomerByKode = async (kode) => {
    if (!kode) return null;

    const query = `
        SELECT 
            c.cus_kode AS kode,
            c.cus_nama AS nama,
            c.cus_alamat AS alamat,
            c.cus_kota AS kota,
            c.cus_telp AS telp,
            c.cus_nama_kontak AS namaKontak,
            c.cus_tgllahir AS tglLahir,
            c.cus_top AS top,
            IF(c.cus_aktif = 0, 'AKTIF', 'PASIF') AS status,
            c.cus_npwp AS npwp,
            c.cus_nama_npwp AS namaNpwp,
            c.cus_alamat_npwp AS alamatNpwp,
            c.cus_kota_npwp AS kotaNpwp,
            c.cus_limit AS limitTrans,
            (
                SELECT lvl.level_nama 
                FROM tcustomer_level_history h 
                LEFT JOIN tcustomer_level lvl ON h.clh_level = lvl.level_kode
                WHERE h.clh_cus_kode = c.cus_kode 
                ORDER BY h.clh_tanggal DESC 
                LIMIT 1
            ) AS levelNama,
            (
                SELECT h.clh_level 
                FROM tcustomer_level_history h 
                WHERE h.clh_cus_kode = c.cus_kode 
                ORDER BY h.clh_tanggal DESC 
                LIMIT 1
            ) AS levelKode
        FROM tcustomer c
        WHERE c.cus_kode = ?
    `;

    try {
        const [rows] = await pool.query(query, [kode]);
        if (rows && rows.length > 0) {
            return rows[0];
        }
        return null;
    } catch (error) {
        console.error(
            "Gagal mengambil detail customer dari DB:",
            error.message,
        );
        throw error;
    }
};

module.exports = {
    searchCustomers,
    getCustomerByKode,
};
