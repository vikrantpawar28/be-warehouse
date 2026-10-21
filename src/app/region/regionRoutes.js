const express = require("express");
const router = express.Router();
const {
  createRegion,
  getAllRegions,
  getRegionById,
  updateRegion,
  deleteRegion, 
} = require("./regionController");

router.post("/createRegion", createRegion);
router.post("/getAllRegions", getAllRegions);
router.get("/getRegionById/:id", getRegionById);
router.put("/updateRegion/:id", updateRegion);
router.delete("/deleteRegion/:id", deleteRegion);

module.exports = router;
