const { Op } = require("sequelize");
const Hub = require("./hubModel");
const Region = require("../region/regionModel");

exports.createHub = async (req, res) => {
  try {
    const hub = await Hub.create(req.body);

    // Return with parent region data
    const createdWithRegion = await Hub.findByPk(hub.hubId, {
      include: [
        {
          model: Region,
          as: "region",
          attributes: ["regionId", "regionName", "regionCode"],
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Hub created successfully",
      data: createdWithRegion,
    });
  } catch (error) {
    console.error("createHub error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A hub with this code already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while creating hub",
    });
  }
};

exports.getAllHubs = async (req, res) => {
  try {
    const {
      search,
      regionId,
      hubType,
      city,
      state,
      isActive,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};

    if (regionId) {
      where.regionId = regionId;
    }

    if (hubType) {
      where.hubType = { [Op.iLike]: `%${hubType}%` };
    }

    if (city) {
      where.city = { [Op.iLike]: `%${city}%` };
    }

    if (state) {
      where.state = { [Op.iLike]: `%${state}%` };
    }

    if (isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true" || isActive === true;
    }


    if (search) {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { hubName: { [Op.iLike]: term } },
        { hubCode: { [Op.iLike]: term } },
        { city: { [Op.iLike]: term } },
        { contactPerson: { [Op.iLike]: term } },
        { contactPhone: { [Op.iLike]: term } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Hub.findAndCountAll({
      where,
      include: [
        {
          model: Region,
          as: "region",
          attributes: ["regionId", "regionName", "regionCode", "state", "country"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      message: "Hubs retrieved successfully",
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("getAllHubs error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while fetching hubs",
    });
  }
};

/**
 * Get Hub by ID
 * GET /api/hubs/:id
 */
exports.getHubById = async (req, res) => {
  try {
    const { id } = req.params;

    const hub = await Hub.findByPk(id, {
      include: [
        {
          model: Region,
          as: "region",
        },
      ],
    });

    if (!hub) {
      return res.status(404).json({
        success: false,
        message: `Hub with id ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hub retrieved successfully",
      data: hub,
    });
  } catch (error) {
    console.error("getHubById error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while fetching hub",
    });
  }
};

exports.updateHub = async (req, res) => {
  try {
    const { id } = req.params;

    const hub = await Hub.findByPk(id);
    if (!hub) {
      return res.status(404).json({
        success: false,
        message: `Hub with id ${id} not found`,
      });
    }

    await hub.update(req.body);

    const updatedWithRegion = await Hub.findByPk(id, {
      include: [
        {
          model: Region,
          as: "region",
          attributes: ["regionId", "regionName", "regionCode"],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "Hub updated successfully",
      data: updatedWithRegion,
    });
  } catch (error) {
    console.error("updateHub error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A hub with this code already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while updating hub",
    });
  }
};

exports.toggleHubStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const hub = await Hub.findByPk(id);
    if (!hub) {
      return res.status(404).json({
        success: false,
        message: `Hub with id ${id} not found`,
      });
    }

    hub.isActive = isActive !== undefined ? Boolean(isActive) : !hub.isActive;
    if (req.user?.userId) hub.updatedBy = req.user.userId;

    await hub.save();

    return res.status(200).json({
      success: true,
      message: `Hub marked as ${hub.isActive ? "Active" : "Inactive"}`,
      data: hub,
    });
  } catch (error) {
    console.error("toggleHubStatus error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while toggling hub status",
    });
  }
};

exports.deleteHub = async (req, res) => {
  try {
    const { id } = req.params;

    const hub = await Hub.findByPk(id);
    if (!hub) {
      return res.status(404).json({
        success: false,
        message: `Hub with id ${id} not found`,
      });
    }

    await hub.destroy();

    return res.status(200).json({
      success: true,
      message: "Hub deleted successfully",
    });
  } catch (error) {
    console.error("deleteHub error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while deleting hub",
    });
  }
};

exports.getHubsByRegion = async (req, res) => {
  try {
    const { regionId } = req.params;
    const { isActive } = req.query;

    const region = await Region.findByPk(regionId);
    if (!region) {
      return res.status(404).json({
        success: false,
        message: `Region with id ${regionId} not found`,
      });
    }

    const where = { regionId };
    if (isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true" || isActive === true;
    }

    const hubs = await Hub.findAll({
      where,
      order: [["hubName", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: `Hubs for region '${region.regionName}' retrieved successfully`,
      data: hubs,
    });
  } catch (error) {
    console.error("getHubsByRegion error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while fetching hubs by region",
    });
  }
};
