const express = require("express");
const router = express.Router();

const produkController = require("../controllers/produkController");
const kalkulasiController = require("../controllers/kalkulasiController");

// Rute untuk mendapatkan data produk kaos dari DB
router.get("/produk-kaos", produkController.getProdukKaos);

// Rute untuk mendapatkan data tarif tambahan jasa dari DB
router.get("/tarif-jasa", produkController.getTarifJasa);

// Rute untuk melakukan kalkulasi harga secara dinamis di backend
router.post("/kalkulasi-harga", kalkulasiController.calculatePrice);

module.exports = router;
