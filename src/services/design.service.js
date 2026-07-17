const { pool } = require("../config/database");

/**
 * Menyimpan data mockup desain baru ke database tdesign_kaostudio
 */
const saveDesign = async (params) => {
    const { id, canvasState, shirtColor, viewType, csNameTemp, csPhoneTemp } = params;

    // Hitung tanggal kedaluwarsa link (30 hari dari sekarang)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const query = `
        INSERT INTO tdesign_kaostudio 
        (id, canvas_state, shirt_color, view_type, cs_name_temp, cs_phone_temp, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await pool.query(query, [
            id,
            canvasState,
            shirtColor,
            viewType,
            csNameTemp || null,
            csPhoneTemp || null,
            expiresAt,
        ]);
        return {
            id,
            shirtColor,
            viewType,
            csNameTemp,
            csPhoneTemp,
            expiresAt,
        };
    } catch (error) {
        console.error("Gagal menyimpan data mockup ke database:", error.message);
        throw error;
    }
};

/**
 * Mengambil data mockup desain berdasarkan UUID
 */
const getDesignById = async (id) => {
    const query = `
        SELECT id, canvas_state AS canvasState, shirt_color AS shirtColor, 
               view_type AS viewType, cs_name_temp AS csNameTemp, 
               cs_phone_temp AS csPhoneTemp, created_at AS createdAt, 
               expires_at AS expiresAt
        FROM tdesign_kaostudio
        WHERE id = ?
    `;

    try {
        const [rows] = await pool.query(query, [id]);
        if (rows && rows.length > 0) {
            return rows[0];
        }
        return null;
    } catch (error) {
        console.error("Gagal mengambil data mockup dari database:", error.message);
        throw error;
    }
};

module.exports = {
    saveDesign,
    getDesignById,
};
