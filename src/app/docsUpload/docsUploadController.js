const {
  upload,
  imageMulter,
  resolveUploadedUrl,
} = require("../../shared/middleware/multer");

exports.upload = imageMulter || upload;

exports.singleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = resolveUploadedUrl(req.file, "/public/profileImage");

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        filename: req.file.filename,
        fileUrl,
        profileImageUrl: `/profileImage/${req.file.filename}`,
        filePath: `public/profileImage/${req.file.filename}`,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.multiUpload = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }

    const files = req.files.map((file) => ({
      filename: file.filename,
      fileUrl: resolveUploadedUrl(file, "/public/profileImage"),
      profileImageUrl: `/profileImage/${file.filename}`,
      filePath: `public/profileImage/${file.filename}`,
      mimetype: file.mimetype,
      size: file.size,
    }));

    const fileUrls = files.map((f) => f.fileUrl);

    return res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      data: {
        fileUrls,
        files,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
