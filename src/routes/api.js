const express = require("express");
const router = express.Router();

const produkRoute = require("./produk.route");
const kalkulasiRoute = require("./kalkulasi.route");
const designRoute = require("./design.route");
const penawaranRoute = require("./penawaran.route");
const authRoute = require("./auth.route");
const customerRoute = require("./customer.route");

router.use(produkRoute);
router.use(kalkulasiRoute);
router.use(designRoute);
router.use(penawaranRoute);
router.use(authRoute);
router.use(customerRoute);

module.exports = router;
