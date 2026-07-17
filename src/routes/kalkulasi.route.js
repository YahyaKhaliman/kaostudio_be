const express = require("express");
const router = express.Router();
const kalkulasiController = require("../controllers/kalkulasi.controller");

router.post("/kalkulasi-harga", kalkulasiController.calculatePrice);

module.exports = router;
