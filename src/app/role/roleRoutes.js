const express = require("express");
const router = express.Router();
const {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  getPermissionsCatalog,
  getRolePermissions,
  assignPermissionsToRole,
} = require("./roleController");
const { verifyToken, checkPermission } = require("../../shared/middleware/authMiddleware");

// All role routes require authentication
router.use(verifyToken);

// Permissions Catalog & Assignment (Screen 3)
router.get("/permissions-catalog", checkPermission("ROLES_VIEW"), getPermissionsCatalog);
router.get("/:roleId/permissions", checkPermission("ROLES_VIEW"), getRolePermissions);
router.put("/:roleId/assign-permissions", checkPermission("ROLES_EDIT"), assignPermissionsToRole);

// Role CRUD
router.post("/createRole", checkPermission("ROLES_CREATE"), createRole);
router.get("/getAllRoles", checkPermission("ROLES_VIEW"), getAllRoles);
router.get("/getRoleById/:roleId", checkPermission("ROLES_VIEW"), getRoleById);
router.put("/updateRole/:roleId", checkPermission("ROLES_EDIT"), updateRole);
router.delete("/deleteRole/:roleId", checkPermission("ROLES_DELETE"), deleteRole);

module.exports = router;
