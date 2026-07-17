const express = require("express");
const router = express.Router();
const produkController = require("../controllers/produk.controller");

router.get("/produk", produkController.getProduk);

router.get("/tarif-jasa", produkController.getTarifJasa);

router.get("/warna", produkController.getWarnaTersedia);

module.exports = router;
