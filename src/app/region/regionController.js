const { Op } = require("sequelize");
const Region = require("./regionModel");
const Hub = require("../hub/hubModel");

exports.createRegion = async (req, res) => {
  try {
    const region = await Region.create(req.body);

    return res.status(201).json({
      success: true,
      message: "Region created successfully",
      data: region,
    });
  } catch (error) {
    console.error("createRegion error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A region with this code already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while creating region",
    });
  }
};


exports.getAllRegions = async (req, res) => {
  try {
    const {
      search,
      state,
      country,
      isActive,
      includeHubs,
      page = 1,
      limit = 10,
    } = req.body;

    const where = {};

    if (isActive !== undefined && isActive !== "") {
      where.isActive = isActive === "true" || isActive === true;
    }

   

    if (state) {
      where.state = { [Op.iLike]: `%${state}%` };
    }

    if (country) {
      where.country = { [Op.iLike]: `%${country}%` };
    }

    if (search) {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { regionName: { [Op.iLike]: term } },
        { regionCode: { [Op.iLike]: term } },
        { state: { [Op.iLike]: term } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const queryOptions = {
      where,
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
      distinct: true,
    };

    if (includeHubs === "true" || includeHubs === true) {
      queryOptions.include = [
        {
          model: Hub,
          as: "hubs",
          attributes: ["hubId", "hubName", "hubCode", "hubType", "city", "isActive"],
        },
      ];
    }

    const { count, rows } = await Region.findAndCountAll(queryOptions);

    return res.status(200).json({
      success: true,
      message: "Regions retrieved successfully",
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("getAllRegions error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while fetching regions",
    });
  }
};


exports.getRegionById = async (req, res) => {
  try {
    const { id } = req.params;

    const region = await Region.findByPk(id, {
      include: [
        {
          model: Hub,
          as: "hubs",
        },
      ],
    });

    if (!region) {
      return res.status(404).json({
        success: false,
        message: `Region with id ${id} not found`,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Region retrieved successfully",
      data: region,
    });
  } catch (error) {
    console.error("getRegionById error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while fetching region",
    });
  }
};


exports.updateRegion = async (req, res) => {
  try {
    const { id } = req.params;

    const region = await Region.findByPk(id);
    if (!region) {
      return res.status(404).json({
        success: false,
        message: `Region with id ${id} not found`,
      });
    }

    await region.update(req.body);

    return res.status(200).json({
      success: true,
      message: "Region updated successfully",
      data: region,
    });
  } catch (error) {
    console.error("updateRegion error:", error);
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({
        success: false,
        message: "A region with this code already exists",
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while updating region",
    });
  }
};


exports.deleteRegion = async (req, res) => {
  try {
    const { id } = req.params;

    const region = await Region.findByPk(id);
    if (!region) {
      return res.status(404).json({
        success: false,
        message: `Region with id ${id} not found`,
      });
    }

    // Safety check: ensure no child hubs are attached
    const hubCount = await Hub.count({ where: { regionId: id } });
    if (hubCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete region: ${hubCount} hub(s) are currently associated with this region. Reassign or delete those hubs first.`,
      });
    }

    await region.destroy();

    return res.status(200).json({
      success: true,
      message: "Region deleted successfully",
    });
  } catch (error) {
    console.error("deleteRegion error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while deleting region",
    });
  }
};
