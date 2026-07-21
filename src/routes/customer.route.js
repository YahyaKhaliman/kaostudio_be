const express = require("express");
const router = express.Router();
const customerController = require("../controllers/customer.controller");

router.get("/lookup/customers", customerController.searchCustomers);
router.get("/customers/:kode", customerController.getCustomerByKode);

module.exports = router;
