const { Op } = require("sequelize");
const { Role, Permission, RolePermission } = require("./roleModel");
const User = require("../user/userModel");
const sequelize = require("../../config/dbConnection");

// 1. Create a new Role
exports.createRole = async (req, res) => {
  try {
    const { roleName, roleCode, description } = req.body;

    if (!roleName || !roleCode) {
      return res.status(400).json({
        success: false,
        message: "roleName and roleCode are required",
      });
    }

    const code = String(roleCode).trim().toUpperCase();

    const existing = await Role.findOne({
      where: {
        [Op.or]: [{ roleCode: code }, { roleName: String(roleName).trim() }],
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A role with this name or code already exists",
      });
    }

    const role = await Role.create({
      roleName: String(roleName).trim(),
      roleCode: code,
      description: description || null,
      isSystemRole: false,
      status: "ACTIVE",
    });

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      data: role,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Get All Roles (with optional search and status filter)
exports.getAllRoles = async (req, res) => {
  try {
    const { search, status, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { roleName: { [Op.iLike]: `%${search}%` } },
        { roleCode: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

    const { rows, count } = await Role.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset,
      order: [["roleId", "ASC"]],
      include: [
        {
          model: Permission,
          as: "permissions",
          attributes: ["permissionId", "permissionCode", "action", "moduleName"],
          through: { attributes: [] },
        },
      ],
      distinct: true,
    });

    return res.status(200).json({
      success: true,
      data: {
        roles: rows,
        total: count,
        page: parseInt(page, 10),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Get Role By ID (with assigned permissions)
exports.getRoleById = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findByPk(roleId, {
      include: [
        {
          model: Permission,
          as: "permissions",
          attributes: [
            "permissionId",
            "moduleName",
            "moduleCode",
            "permissionName",
            "permissionCode",
            "action",
          ],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    return res.status(200).json({ success: true, data: role });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update Role
exports.updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { roleName, description, status } = req.body;

    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    if (role.isSystemRole && status === "INACTIVE") {
      return res.status(400).json({
        success: false,
        message: "System roles cannot be deactivated",
      });
    }

    if (roleName) role.roleName = roleName;
    if (description !== undefined) role.description = description;
    if (status) role.status = status;

    await role.save();

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: role,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Delete Role
exports.deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: "System roles cannot be deleted",
      });
    }

    // Check if users are assigned to this role
    const assignedUserCount = await User.count({ where: { roleId } });
    if (assignedUserCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role. There are ${assignedUserCount} user(s) assigned to it.`,
      });
    }

    await role.destroy();

    return res.status(200).json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// SCREEN 3: PERMISSIONS CATALOG & ASSIGNMENT
// =========================================================================

// 6. Get Permissions Catalog (Populates the Accordion Matrix in Screen 3)
exports.getPermissionsCatalog = async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [
        ["moduleName", "ASC"],
        ["moduleCode", "ASC"],
        ["permissionId", "ASC"],
      ],
    });

    // Structure grouped by moduleName -> subModules
    const sectionsMap = {};

    for (const p of permissions) {
      if (!sectionsMap[p.moduleName]) {
        sectionsMap[p.moduleName] = {};
      }
      if (!sectionsMap[p.moduleName][p.moduleCode]) {
        sectionsMap[p.moduleName][p.moduleCode] = {
          moduleCode: p.moduleCode,
          moduleTitle: p.permissionName.split(" ")[1] || p.moduleCode,
          permissions: [],
        };
      }

      sectionsMap[p.moduleName][p.moduleCode].permissions.push({
        permissionId: p.permissionId,
        permissionName: p.permissionName,
        permissionCode: p.permissionCode,
        action: p.action,
      });
    }

    // Convert to a client-friendly array
    const catalog = Object.keys(sectionsMap).map((sectionName) => ({
      sectionHeading: sectionName,
      subModules: Object.values(sectionsMap[sectionName]),
    }));

    return res.status(200).json({
      success: true,
      data: catalog,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Get Role's Currently Assigned Permission IDs
exports.getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;

    const role = await Role.findByPk(roleId, {
      include: [
        {
          model: Permission,
          as: "permissions",
          attributes: ["permissionId", "permissionCode"],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    const assignedPermissionIds = (role.permissions || []).map((p) => p.permissionId);
    const assignedPermissionCodes = (role.permissions || []).map((p) => p.permissionCode);

    return res.status(200).json({
      success: true,
      data: {
        roleId: role.roleId,
        roleName: role.roleName,
        roleCode: role.roleCode,
        assignedPermissionIds,
        assignedPermissionCodes,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Assign / Update Permissions for a Role (Screen 3 Save Action)
exports.assignPermissionsToRole = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { roleId } = req.params;
    const { permissionIds = [] } = req.body;

    const role = await Role.findByPk(roleId, { transaction });
    if (!role) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    // 1. Remove existing permissions for this role
    await RolePermission.destroy({ where: { roleId }, transaction });

    // 2. Insert new selections
    if (Array.isArray(permissionIds) && permissionIds.length > 0) {
      // Validate that all permissions exist
      const validPermissions = await Permission.findAll({
        where: { permissionId: { [Op.in]: permissionIds } },
        attributes: ["permissionId"],
        transaction,
      });

      const records = validPermissions.map((p) => ({
        roleId: role.roleId,
        permissionId: p.permissionId,
      }));

      await RolePermission.bulkCreate(records, { transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: "Role permissions updated successfully",
      assignedCount: permissionIds.length,
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: error.message });
  }
};
