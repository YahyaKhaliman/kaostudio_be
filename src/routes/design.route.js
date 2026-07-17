const express = require("express");
const router = express.Router();
const designController = require("../controllers/design.controller");

router.post("/designs", designController.createDesign);
router.get("/designs/:id", designController.getDesign);

module.exports = router;
