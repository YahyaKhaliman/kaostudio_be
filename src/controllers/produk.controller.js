const produkService = require("../services/produk.service");
const { successResponse } = require("../utils/responseHelper");

const getProduk = async (req, res, next) => {
    try {
        const result = await produkService.getProduk();

        return successResponse(res, result, "Berhasil mengambil data produk");
    } catch (error) {
        console.error("Gagal mengambil data produk di controller", error);
        next(error);
    }
};

const getTarifJasa = async (req, res, next) => {
    try {
        const rows = await produkService.getTarifJasa();

        if (!rows || rows.length === 0) {
            return successResponse(
                res,
                [],
                "Data tarif tambahan jasa kosong di database",
            );
        }

        // Normalisasi format response
        const dataJasa = rows.map((r) => ({
            nama_jasa: r.nama_jasa.toUpperCase(),
            tarif_per_cm: Number(r.tarif_per_cm),
            minimal_tarif: Number(r.minimal_tarif),
        }));

        return successResponse(
            res,
            dataJasa,
            "Berhasil mengambil data tarif jasa",
        );
    } catch (error) {
        console.error("Gagal mengambil data tarif jasa di controller:", error);
        next(error);
    }
};

const getWarnaTersedia = async (req, res, next) => {
    try {
        const mapping = await produkService.getWarnaTersedia();

        return successResponse(
            res,
            mapping,
            "Berhasil mengambil data model dan warna yang tersedia di database",
        );
    } catch (error) {
        console.error(
            "Gagal mengambil data warna tersedia di controller:",
            error,
        );
        next(error);
    }
};

const searchProduk = async (req, res, next) => {
    try {
        const { term = "" } = req.query;
        const result = await produkService.searchProduk(term);
        return successResponse(res, result, "Berhasil mencari data produk");
    } catch (error) {
        console.error("Gagal melakukan pencarian produk di controller:", error);
        next(error);
    }
};

module.exports = {
    getProduk,
    getTarifJasa,
    getWarnaTersedia,
    searchProduk,
};
