const {
  imageMulter,
  resumeMulter,
  resolveUploadedUrl,
} = require("../../../shared/services/storage/spacesStorage");

exports.upload = imageMulter;
exports.publicUpload = resumeMulter;

exports.singleUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = resolveUploadedUrl(req.file, "/image");

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: { fileUrl },
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

    const fileUrls = req.files.map((file) => resolveUploadedUrl(file, "/image"));

    return res.status(200).json({
      success: true,
      message: "Files uploaded successfully",
      data: { fileUrls },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Public — the career portal's resume upload, no HRMS login involved.
exports.publicUploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const fileUrl = resolveUploadedUrl(req.file, "/resumes");

    return res.status(200).json({
      success: true,
      message: "Resume uploaded successfully",
      data: { fileUrl },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
