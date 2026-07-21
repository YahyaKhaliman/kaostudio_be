const authService = require("../services/auth.service");
const { successResponse } = require("../utils/responseHelper");

const loginAdmin = async (req, res, next) => {
    try {
        const result = await authService.loginAdmin(req.body);
        return successResponse(
            res,
            result,
            "Berhasil melakukan autentikasi admin",
        );
    } catch (error) {
        console.error("Kesalahan autentikasi admin di controller:", error);
        res.status(401).json({
            success: false,
            message: error.message || "Gagal melakukan autentikasi admin",
        });
    }
};

module.exports = {
    loginAdmin,
};
