const express = require("express");
const router = express.Router();

const { upload, publicUpload, singleUpload, multiUpload, publicUploadResume } = require("./docsUploadController");
const verifyToken = require("../../../shared/middleware/jwtToken");
const { requirePermission } = require("../../../shared/services/authorization/requirePermission");

// Public — career portal resume upload, no HRMS login involved.
router.post("/publicUpload", publicUpload.single("file"), publicUploadResume);

router.post("/singleUpload", verifyToken, requirePermission("Documents.UPLOAD"), upload.single("file"), singleUpload);
router.post("/multiUpload", verifyToken, requirePermission("Documents.UPLOAD"), upload.array("files", 10), multiUpload);

module.exports = router;
