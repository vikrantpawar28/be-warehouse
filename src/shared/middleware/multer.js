const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure public/profileImage directory exists
const uploadDir = path.join(process.cwd(), "public", "profileImage");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer disk storage configuration for storing images in public/profileImage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

// Image file filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|gif|webp|svg/;
  const allowedMimeTypes = /image\/(jpeg|jpg|png|gif|webp|svg\+xml)/;

  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedMimeTypes.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }
  return cb(
    new Error("Only image files (jpeg, jpg, png, gif, webp, svg) are allowed!"),
    false
  );
};

// Max file size limit from .env (defaults to 5MB)
const maxFileSizeMb = parseInt(process.env.FILESIZE_MB, 10) || 5;

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
  },
  fileFilter,
});

/**
 * Resolves accessible URL for the uploaded file
 * @param {Object} file - Express req.file object
 * @param {string} prefix - Path prefix (default: "/public/profileImage")
 * @returns {string|null}
 */
const resolveUploadedUrl = (file, prefix = "/public/profileImage") => {
  if (!file) return null;
  const filename = file.filename || path.basename(file.path || "");
  const cleanPrefix = prefix.replace(/\/$/, "");
  return `${cleanPrefix}/${filename}`;
};

// Spreadsheet file filter (.xlsx, .xls, .csv)
const spreadsheetFilter = (req, file, cb) => {
  const allowedExtensions = /\.(xlsx|xls|csv)$/i;
  const isExtValid = allowedExtensions.test(file.originalname);
  if (isExtValid) {
    return cb(null, true);
  }
  return cb(
    new Error("Only spreadsheet files (.xlsx, .xls, .csv) are allowed!"),
    false
  );
};

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.FILESIZE_MB, 10) || 15) * 1024 * 1024,
  },
  fileFilter: spreadsheetFilter,
});

module.exports = upload;
module.exports.upload = upload;
module.exports.imageMulter = upload;
module.exports.profileImageUpload = upload;
module.exports.excelUpload = excelUpload;
module.exports.spreadsheetUpload = excelUpload;
module.exports.resolveUploadedUrl = resolveUploadedUrl;
module.exports.uploadDir = uploadDir;
