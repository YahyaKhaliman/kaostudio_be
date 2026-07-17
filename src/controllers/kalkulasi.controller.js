const kalkulasiService = require("../services/kalkulasi.service");
const { successResponse } = require("../utils/responseHelper");

const calculatePrice = async (req, res, next) => {
    try {
        const result = await kalkulasiService.calculatePrice(req.body);
        return successResponse(
            res,
            result,
            "Berhasil menghitung estimasi harga",
        );
    } catch (error) {
        console.error("Kesalahan kalkulasi harga di controller:", error);
        next(error);
    }
};

module.exports = {
    calculatePrice,
};
