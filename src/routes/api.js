const express = require("express");
const router = express.Router();

const produkRoute = require("./produk.route");
const kalkulasiRoute = require("./kalkulasi.route");
const designRoute = require("./design.route");

router.use(produkRoute);
router.use(kalkulasiRoute);
router.use(designRoute);

module.exports = router;
