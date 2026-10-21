const express = require("express");
const router = express.Router();

const {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  getPurchaseOrderDashboard,
  upload,
  uploadAndStage,
  downloadSampleTemplate,
} = require("./purchaseOrderController")
router.get("/dashboard", getPurchaseOrderDashboard);
router.get("/sampleTemplate", downloadSampleTemplate);
router.post("/createPurchaseOrder", createPurchaseOrder);
router.post("/getAllPurchaseOrders", getAllPurchaseOrders);
router.get("/getPurchaseOrderById/:id", getPurchaseOrderById);
router.put("/updatePurchaseOrder/:id", updatePurchaseOrder);
router.post("/upload", upload, uploadAndStage);

module.exports = router;
