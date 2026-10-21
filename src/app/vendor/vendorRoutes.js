
const express = require("express");
const router = express.Router();

const {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} = require("./vendorController"); 

router.post("/createVendor", createVendor);
router.post("/getAllVendors", getAllVendors);
router.get("/getVendorById/:id", getVendorById);
router.put("/updateVendor/:id", updateVendor);
router.delete("/deleteVendor/:id", deleteVendor);

module.exports = router;
