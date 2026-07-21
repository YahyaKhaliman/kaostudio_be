const penawaranService = require("../services/penawaran.service");
const { successResponse } = require("../utils/responseHelper");

const savePenawaran = async (req, res, next) => {
    try {
        const result = await penawaranService.savePenawaran(req.body);
        return successResponse(
            res,
            result,
            "Berhasil menyimpan data penawaran baru",
        );
    } catch (error) {
        console.error("Kesalahan menyimpan penawaran di controller:", error);
        next(error);
    }
};

module.exports = {
    savePenawaran,
};
