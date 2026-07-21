const express = require("express");
const router = express.Router();
const penawaranController = require("../controllers/penawaran.controller");

router.post("/penawaran", penawaranController.savePenawaran);

module.exports = router;
