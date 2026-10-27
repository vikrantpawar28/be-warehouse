const express = require("express");
const router = express.Router();
const multer = require("multer");

const { upload, singleUpload, multiUpload } = require("./docsUploadController");
const { verifyToken } = require("../../shared/middleware/authMiddleware");

router.post(
  "/singleUpload",
  verifyToken,
  upload.single("file"),
  singleUpload
);

router.post(
  "/multiUpload",
  verifyToken,
  upload.array("files", 10),
  multiUpload
);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxMb = process.env.FILESIZE_MB || 5;
      return res.status(400).json({
        success: false,
        message: `File size exceeds the allowed limit of ${maxMb}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
});

module.exports = router;
