const fs = require("fs");
const path = require("path");
const { pool } = require("../config/database");

// Folder penyimpanan gambar fisik di backend: kaostudio_be/uploads/designs/
const UPLOADS_DIR = path.join(__dirname, "../../uploads/designs");

const ensureUploadDirExists = () => {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

/**
 * Merekam gambar Base64 dari canvasState menjadi file fisik di direktori server
 * dan mengganti string Base64 dengan URL path file statis.
 */
const extractAndSaveBase64Images = (canvasStateInput, designId) => {
    if (!canvasStateInput) return canvasStateInput;

    ensureUploadDirExists();

    let stateObj = canvasStateInput;
    if (typeof canvasStateInput === "string") {
        try {
            stateObj = JSON.parse(canvasStateInput);
        } catch (e) {
            return canvasStateInput;
        }
    }

    let imgCounter = 0;

    const processObject = (obj) => {
        if (!obj || typeof obj !== "object") return obj;

        if (Array.isArray(obj)) {
            return obj.map(processObject);
        }

        const newObj = { ...obj };

        for (const key in newObj) {
            const val = newObj[key];

            if (typeof val === "string" && val.startsWith("data:image/")) {
                try {
                    const matches = val.match(
                        /^data:image\/([a-zA-Z0-9]+);base64,(.+)$/,
                    );
                    if (matches && matches.length === 3) {
                        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
                        const base64Data = matches[2];
                        imgCounter++;

                        const filename = `${designId}_img_${imgCounter}_${Date.now()}.${ext}`;
                        const filePath = path.join(UPLOADS_DIR, filename);

                        fs.writeFileSync(
                            filePath,
                            Buffer.from(base64Data, "base64"),
                        );

                        // Ganti string Base64 raksasa dengan path direktori relatif server
                        newObj[key] = `/uploads/designs/${filename}`;
                    }
                } catch (err) {
                    console.error(
                        "Gagal mengekstrak gambar Base64 ke file fisik:",
                        err,
                    );
                }
            } else if (typeof val === "object" && val !== null) {
                newObj[key] = processObject(val);
            }
        }

        return newObj;
    };

    const processedObj = processObject(stateObj);
    return JSON.stringify(processedObj);
};

/**
 * Format Date object ke string DATETIME lokal WIB (YYYY-MM-DD HH:mm:ss)
 */
const formatLocalDatetime = (date = new Date()) => {
    const pad = (n) => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const saveDesign = async (params) => {
    const { id, canvasState, shirtColor, viewType, csNameTemp, csPhoneTemp } =
        params;

    // Ekstrak gambar Base64 ke direktori /uploads/designs/ dan dapatkan JSON dengan path file
    const cleanCanvasState = extractAndSaveBase64Images(canvasState, id);

    const now = new Date();
    const createdAtStr = formatLocalDatetime(now);

    const expiresDate = new Date(now);
    expiresDate.setDate(expiresDate.getDate() + 30);
    const expiresAtStr = formatLocalDatetime(expiresDate);

    const query = `
        INSERT INTO tdesign_kaostudio 
        (id, canvas_state, shirt_color, view_type, cs_name_temp, cs_phone_temp, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await pool.query(query, [
            id,
            cleanCanvasState,
            shirtColor,
            viewType,
            csNameTemp || null,
            csPhoneTemp || null,
            createdAtStr,
            expiresAtStr,
        ]);
        return {
            id,
            shirtColor,
            viewType,
            csNameTemp,
            csPhoneTemp,
            createdAt: createdAtStr,
            expiresAt: expiresAtStr,
        };
    } catch (error) {
        console.error(
            "Gagal menyimpan data mockup ke database:",
            error.message,
        );
        throw error;
    }
};

/**
 * Mengambil data mockup desain berdasarkan ID
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
        console.error(
            "Gagal mengambil data mockup dari database:",
            error.message,
        );
        throw error;
    }
};

module.exports = {
    saveDesign,
    getDesignById,
};
