const { imageMulter } = require("../services/storage/spacesStorage");

// Re-export the primary Spaces image uploader as the shared docsUpload middleware
module.exports = imageMulter;
