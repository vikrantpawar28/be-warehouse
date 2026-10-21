const express = require("express");
const router = express.Router();
const {
  createHub,
  getAllHubs,
  getHubById,
  updateHub,
  deleteHub
} = require("./hubController");

router.post("/createHub", createHub);
router.get("/getAllHubs", getAllHubs);
router.get("/getHubById/:id", getHubById);
router.put("/updateHubById/:id", updateHub);
router.delete("/deleteHubById/:id", deleteHub);

module.exports = router;
