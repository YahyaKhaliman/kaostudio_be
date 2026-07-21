const customerService = require("../services/customer.service");
const { successResponse } = require("../utils/responseHelper");

const searchCustomers = async (req, res, next) => {
    try {
        const { term, limit } = req.query;
        const result = await customerService.searchCustomers(term, limit);
        return successResponse(
            res,
            result,
            "Berhasil mengambil data pencarian customer",
        );
    } catch (error) {
        console.error("Kesalahan pada controller searchCustomers:", error);
        next(error);
    }
};

const getCustomerByKode = async (req, res, next) => {
    try {
        const { kode } = req.params;
        const result = await customerService.getCustomerByKode(kode);

        if (!result) {
            return res.status(404).json({
                status: "error",
                message: `Data customer dengan kode [${kode}] tidak ditemukan.`,
            });
        }

        return successResponse(
            res,
            result,
            "Berhasil mengambil detail customer",
        );
    } catch (error) {
        console.error("Kesalahan pada controller getCustomerByKode:", error);
        next(error);
    }
};

module.exports = {
    searchCustomers,
    getCustomerByKode,
};
