const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const User = require("./userModel");
const { Role, Permission } = require("../role/roleModel");
const Hub = require("../hub/hubModel");
const Region = require("../region/regionModel");
const { JWT_SECRET } = require("../../shared/middleware/authMiddleware");

const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must contain at least 8 characters.";
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one number.";
  }
  return null;
};


exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      where: { email: String(email).trim().toLowerCase() },
      include: [
        {
          model: Role,
          as: "role",
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: ["permissionId", "permissionCode", "action", "moduleCode"],
              through: { attributes: [] },
            },
          ],
        },
        {
          model: Hub,
          as: "hub",
          attributes: ["hubId", "hubName", "hubCode"],
        },
        {
          model: Region,
          as: "region",
          attributes: ["regionId", "regionName", "regionCode"],
        },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive or suspended. Contact an administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isSuperAdmin = user.role?.roleCode === "SUPER_ADMIN" || user.role?.isSystemRole;

    // Granted permissions list
    const permissions = isSuperAdmin
      ? ["*"]
      : (user.role?.permissions || []).map((p) => p.permissionCode);

    const tokenPayload = {
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      roleId: user.roleId,
      roleCode: user.role?.roleCode,
      isSuperAdmin,
      hubId: user.hubId,
      regionId: user.regionId,
      permissions,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1d" });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          profilePhoto: user.profilePhoto,
          status: user.status,
          role: user.role ? {
            roleId: user.role.roleId,
            roleName: user.role.roleName,
            roleCode: user.role.roleCode,
          } : null,
          hub: user.hub,
          region: user.region,
          isSuperAdmin,
        },
        permissions,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.createUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      fullName,
      email,
      password,
      phone,
      contactNumber,
      profilePhoto,
      roleId,
      hubId,
      regionId,
    } = req.body;

    const userPhone = phone || contactNumber;
    let fName = firstName;
    let lName = lastName;

    if ((!fName || !lName) && fullName) {
      const parts = fullName.trim().split(" ");
      fName = parts[0] || "";
      lName = parts.slice(1).join(" ") || "";
    }

    if (!fName || !lName) {
      return res.status(400).json({
        success: false,
        message: "First name and last name are required",
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!roleId) {
      return res.status(400).json({
        success: false,
        message: "Role assignment is required",
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ where: { email: cleanEmail } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A user with email '${cleanEmail}' already exists`,
      });
    }

    // Verify role exists
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: "Selected role does not exist" });
    }

    // If caller is Hub Admin, they cannot create users outside their own hub
    let finalHubId = hubId || null;
    let finalRegionId = regionId || null;

    if (!req.user.isSuperAdmin) {
      if (req.user.hubId) {
        finalHubId = req.user.hubId;
      }
      if (req.user.regionId) {
        finalRegionId = req.user.regionId;
      }
    }

    // Validate Hub exists if hubId is provided
    if (finalHubId) {
      const hub = await Hub.findByPk(finalHubId);
      if (!hub) {
        return res.status(404).json({
          success: false,
          message: `Hub with id ${finalHubId} does not exist. Please create the hub first, or pass "hubId": null.`,
        });
      }
      if (!finalRegionId && hub.regionId) {
        finalRegionId = hub.regionId;
      }
    }

    // Validate Region exists if regionId is provided
    if (finalRegionId) {
      const region = await Region.findByPk(finalRegionId);
      if (!region) {
        return res.status(404).json({
          success: false,
          message: `Region with id ${finalRegionId} does not exist.`,
        });
      }
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName: fName.trim(),
      lastName: lName.trim(),
      email: cleanEmail,
      password: hashedPassword,
      phone: userPhone ? String(userPhone).trim() : null,
      profilePhoto: profilePhoto || null,
      roleId,
      hubId: finalHubId,
      regionId: finalRegionId,
      status: "ACTIVE",
    });

    const createdUser = await User.findByPk(user.userId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Role, as: "role", attributes: ["roleId", "roleName", "roleCode"] },
        { model: Hub, as: "hub", attributes: ["hubId", "hubName", "hubCode"] },
        { model: Region, as: "region", attributes: ["regionId", "regionName", "regionCode"] },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: createdUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const {
      search = "",
      status,
      roleId,
      hubId,
      regionId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.body;

    const where = {};

    // 1. Status Filter
    if (status) {
      where.status = status;
    }

    // 2. Role Filter
    if (roleId) {
      where.roleId = roleId;
    }

    // 3. Location Scope Enforcement
    if (!req.user.isSuperAdmin) {
      // Hub Admin: restricted to their hub only
      if (req.user.hubId) {
        where.hubId = req.user.hubId;
      } else if (req.user.regionId) {
        // Region Admin: restricted to their region only
        where.regionId = req.user.regionId;
      }
    } else {
      // SuperAdmin: can optionally filter by specific hub or region
      if (hubId) where.hubId = hubId;
      if (regionId) where.regionId = regionId;
    }

    // 4. Search Filter
    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { firstName: { [Op.iLike]: term } },
        { lastName: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { phone: { [Op.iLike]: term } },
      ];
    }

    // 5. Date Range Filter (startDate - endDate)
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          new Date(startDate),
          new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        ],
      };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = {
        [Op.lte]: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * pageSize;

    const { rows, count } = await User.findAndCountAll({
      where,
      limit: pageSize,
      offset,
      order: [["createdAt", "DESC"]],
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["roleId", "roleName", "roleCode"],
        },
        {
          model: Hub,
          as: "hub",
          attributes: ["hubId", "hubName", "hubCode"],
        },
        {
          model: Region,
          as: "region",
          attributes: ["regionId", "regionName", "regionCode"],
        },
      ],
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        users: rows,
        total: count,
        page: pageNum,
        limit: pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["roleId", "roleName", "roleCode"],
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: ["permissionId", "permissionCode", "action", "moduleName"],
              through: { attributes: [] },
            },
          ],
        },
        { model: Hub, as: "hub", attributes: ["hubId", "hubName", "hubCode"] },
        { model: Region, as: "region", attributes: ["regionId", "regionName", "regionCode"] },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Scoping check
    if (!req.user.isSuperAdmin) {
      if (req.user.hubId && user.hubId !== req.user.hubId) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this user" });
      }
      if (req.user.regionId && user.regionId !== req.user.regionId) {
        return res.status(403).json({ success: false, message: "Unauthorized access to this user" });
      }
    }

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      firstName,
      lastName,
      phone,
      profilePhoto,
      roleId,
      hubId,
      regionId,
      status,
      password,
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Scoping check
    if (!req.user.isSuperAdmin) {
      if (req.user.hubId && user.hubId !== req.user.hubId) {
        return res.status(403).json({ success: false, message: "Unauthorized to update this user" });
      }
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone ? String(phone).trim() : null;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    if (roleId) user.roleId = roleId;
    if (status) user.status = status;

    // Location updates allowed for SuperAdmin
    if (req.user.isSuperAdmin) {
      if (hubId !== undefined) user.hubId = hubId || null;
      if (regionId !== undefined) user.regionId = regionId || null;
    }

    // Password reset if provided
    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return res.status(400).json({ success: false, message: passwordError });
      }
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Role, as: "role", attributes: ["roleId", "roleName", "roleCode"] },
        { model: Hub, as: "hub", attributes: ["hubId", "hubName", "hubCode"] },
        { model: Region, as: "region", attributes: ["regionId", "regionName", "regionCode"] },
      ],
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Instead of hard delete, flip to INACTIVE / soft delete
    user.status = "INACTIVE";
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.exportUsers = async (req, res) => {
  try {
    const { search = "", status, roleId, hubId, regionId, startDate, endDate } = req.body;

    const where = {};
    if (status) where.status = status;
    if (roleId) where.roleId = roleId;

    if (!req.user.isSuperAdmin) {
      if (req.user.hubId) where.hubId = req.user.hubId;
      else if (req.user.regionId) where.regionId = req.user.regionId;
    } else {
      if (hubId) where.hubId = hubId;
      if (regionId) where.regionId = regionId;
    }

    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = [
        { firstName: { [Op.iLike]: term } },
        { lastName: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { phone: { [Op.iLike]: term } },
      ];
    }

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(new Date(endDate).setHours(23, 59, 59, 999))],
      };
    }

    const users = await User.findAll({
      where,
      order: [["createdAt", "DESC"]],
      attributes: ["userId", "firstName", "lastName", "email", "phone", "status", "createdAt"],
      include: [
        { model: Role, as: "role", attributes: ["roleName"] },
        { model: Hub, as: "hub", attributes: ["hubName", "hubCode"] },
        { model: Region, as: "region", attributes: ["regionName"] },
      ],
    });

    const exportData = users.map((u) => ({
      ID: u.userId,
      "First Name": u.firstName,
      "Last Name": u.lastName,
      Email: u.email,
      Phone: u.phone || "",
      Role: u.role?.roleName || "",
      Hub: u.hub?.hubName || "All Hubs",
      Region: u.region?.regionName || "All Regions",
      Status: u.status,
      "Created At": u.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: exportData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: "role",
          include: [
            {
              model: Permission,
              as: "permissions",
              attributes: ["permissionId", "permissionCode"],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const assignedPermissionIds = (user.role?.permissions || []).map((p) => p.permissionId);
    const assignedPermissionCodes = (user.role?.permissions || []).map((p) => p.permissionCode);

    return res.status(200).json({
      success: true,
      data: {
        userId: user.userId,
        fullName: user.fullName,
        roleId: user.roleId,
        roleName: user.role?.roleName,
        roleCode: user.role?.roleCode,
        assignedPermissionIds,
        assignedPermissionCodes,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


exports.assignUserPermissions = async (req, res) => {
  const sequelize = require("../../config/dbConnection");
  const { RolePermission } = require("../role/roleModel");
  const transaction = await sequelize.transaction();

  try {
    const { userId } = req.params;
    const { permissionIds = [] } = req.body;

    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.roleId) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "User has no role assigned" });
    }

    // Update the role permissions
    await RolePermission.destroy({ where: { roleId: user.roleId }, transaction });

    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      const records = permissionIds.map((pId) => ({
        roleId: user.roleId,
        permissionId: pId,
      }));
      await RolePermission.bulkCreate(records, { transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `Permissions updated successfully for user ${user.fullName}`,
      assignedCount: permissionIds.length,
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};

