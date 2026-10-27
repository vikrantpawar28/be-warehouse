
const Vendor = require("./vendorModel");
const { Op } = require("sequelize");

// Create Vendor
exports.createVendor = async (req, res) => {
  try {
    const {
      vendorCode,
      vendorName,
      gstin,
      contactDetails,
      registeredAddress,
      vendorCategory,
      isActive,
    } = req.body;

    if (
      !vendorCode ||
      !vendorName ||
      !gstin ||
      !contactDetails ||
      !registeredAddress ||
      !vendorCategory
    ) {
      return res.status(400).json({
        success: false,
        message: "All required vendor fields must be provided.",
      });
    }

    // Check duplicate vendor code or GSTIN
    const existingVendor = await Vendor.findOne({
      where: {
        [Op.or]: [{ vendorCode }, { gstin }],
      },
    });

    if (existingVendor) {
      return res.status(409).json({
        success: false,
        message:
          existingVendor.vendorCode === vendorCode
            ? "Vendor code already exists."
            : "GSTIN already exists.",
      });
    }

    const vendor = await Vendor.create({
      vendorCode,
      vendorName,
      gstin,
      contactDetails,
      registeredAddress,
      vendorCategory,
      isActive,
      createdBy: req.user?.userId || null,
      updatedBy: req.user?.userId || null,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully.",
      data: vendor,
    });
  } catch (error) {
    console.error("Create Vendor Error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Vendor code or GSTIN already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create vendor.",
    });
  }
};

// Get All Vendors with Search, Filters, Pagination and Sorting
exports.getAllVendors = async (req, res) => {
  try {
    const {
      search = "",
      vendorCategory,
      isActive,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.body;

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);
    const limitNumber = Math.min(
      100,
      Math.max(1, parseInt(limit, 10) || 10)
    );
    const offset = (pageNumber - 1) * limitNumber;

    const allowedSortFields = [
      "vendorId",
      "vendorCode",
      "vendorName",
      "vendorCategory",
      "createdAt",
      "updatedAt",
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    const safeSortOrder =
      String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

    const where = {};

    if (search.trim()) {
      where[Op.or] = [
        { vendorCode: { [Op.iLike]: `%${search.trim()}%` } },
        { vendorName: { [Op.iLike]: `%${search.trim()}%` } },
        { gstin: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    if (vendorCategory) {
      where.vendorCategory = vendorCategory;
    }

    if (isActive !== undefined) {
      if (!["true", "false"].includes(String(isActive).toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false.",
        });
      }

      where.isActive = String(isActive).toLowerCase() === "true";
    }

    const { count, rows } = await Vendor.findAndCountAll({
      where,
      limit: limitNumber,
      offset,
      order: [[safeSortBy, safeSortOrder]],
    });

    return res.status(200).json({
      success: true,
      message: "Vendors fetched successfully.",
      data: rows,
      pagination: {
        totalRecords: count,
        currentPage: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(count / limitNumber),
        hasNextPage: pageNumber < Math.ceil(count / limitNumber),
        hasPreviousPage: pageNumber > 1,
      },
    });
  } catch (error) {
    console.error("Get Vendors Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendors.",
    });
  }
};

// Get Vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID.",
      });
    }

    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor fetched successfully.",
      data: vendor,
    });
  } catch (error) {
    console.error("Get Vendor Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch vendor.",
    });
  }
};

// Update Vendor
exports.updateVendor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID.",
      });
    }

    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found.",
      });
    }

    const allowedFields = [
      "vendorCode",
      "vendorName",
      "gstin",
      "contactDetails",
      "registeredAddress",
      "vendorCategory",
      "isActive",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update.",
      });
    }

    // Check duplicate vendor code or GSTIN, excluding current vendor
    const duplicateConditions = [];

    if (updates.vendorCode !== undefined) {
      duplicateConditions.push({ vendorCode: updates.vendorCode });
    }

    if (updates.gstin !== undefined) {
      duplicateConditions.push({ gstin: updates.gstin });
    }

    if (duplicateConditions.length > 0) {
      const existingVendor = await Vendor.findOne({
        where: {
          [Op.and]: [
            { vendorId: { [Op.ne]: id } },
            { [Op.or]: duplicateConditions },
          ],
        },
      });

      if (existingVendor) {
        return res.status(409).json({
          success: false,
          message:
            updates.vendorCode !== undefined &&
            existingVendor.vendorCode === updates.vendorCode
              ? "Vendor code already exists."
              : "GSTIN already exists.",
        });
      }
    }

    updates.updatedBy = req.user?.userId || null;

    await vendor.update(updates);

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully.",
      data: vendor,
    });
  } catch (error) {
    console.error("Update Vendor Error:", error);

    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: error.errors.map((e) => e.message),
      });
    }

    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "Vendor code or GSTIN already exists.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update vendor.",
    });
  }
};


// Delete Vendor
exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d+$/.test(id) || BigInt(id) <= 0n) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID.",
      });
    }

    const vendor = await Vendor.findByPk(id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found.",
      });
    }

    await vendor.destroy();

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Vendor Error:", error);

    if (error.name === "SequelizeForeignKeyConstraintError") {
      return res.status(409).json({
        success: false,
        message:
          "Vendor cannot be deleted because it is referenced by other records.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete vendor.",
    });
  }
};
