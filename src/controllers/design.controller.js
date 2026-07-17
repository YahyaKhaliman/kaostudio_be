const crypto = require("crypto");
const designService = require("../services/design.service");
const { successResponse } = require("../utils/responseHelper");

const createDesign = async (req, res, next) => {
    try {
        const { canvasState, shirtColor, viewType, csNameTemp, csPhoneTemp } =
            req.body;

        if (!canvasState || !shirtColor || !viewType) {
            return res.status(400).json({
                status: "error",
                message:
                    "Parameter canvasState, shirtColor, dan viewType wajib diisi.",
            });
        }

        const id = crypto.randomUUID();

        const result = await designService.saveDesign({
            id,
            canvasState:
                typeof canvasState === "string"
                    ? canvasState
                    : JSON.stringify(canvasState),
            shirtColor,
            viewType,
            csNameTemp,
            csPhoneTemp,
        });

        return successResponse(res, result, "Berhasil menyimpan mockup desain");
    } catch (error) {
        console.error("Kesalahan penyimpanan desain di controller:", error);
        next(error);
    }
};

const getDesign = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await designService.getDesignById(id);

        if (!result) {
            return res.status(404).json({
                status: "error",
                message:
                    "Mockup desain tidak ditemukan atau tautan telah kedaluwarsa.",
            });
        }

        return successResponse(
            res,
            result,
            "Berhasil mengambil data mockup desain",
        );
    } catch (error) {
        console.error("Kesalahan pengambilan desain di controller:", error);
        next(error);
    }
};

module.exports = {
    createDesign,
    getDesign,
};
