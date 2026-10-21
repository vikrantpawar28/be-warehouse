const express = require("express");
const router = express.Router();
const {
  loginUser,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  toggleUserStatus,
  deleteUser,
  exportUsers,
  getUserPermissions,
  assignUserPermissions,
} = require("./userController");
const { verifyToken, checkPermission } = require("../../shared/middleware/authMiddleware");

// Public Auth Route
router.post("/login", loginUser);

// Protected User Management Routes
router.post("/createUser", verifyToken, checkPermission("USERS_CREATE"), createUser);
router.post("/getAllUsers", verifyToken, checkPermission("USERS_VIEW"), getAllUsers);
router.get("/getUserById/:userId", verifyToken, checkPermission("USERS_VIEW"), getUserById);
router.put("/updateUser/:userId", verifyToken, checkPermission("USERS_EDIT"), updateUser);
router.delete("/deleteUser/:userId", verifyToken, checkPermission("USERS_DELETE"), deleteUser);
router.post("/exportUsers", verifyToken, checkPermission("USERS_VIEW"), exportUsers);

// User-specific Permissions (Assign Screen)
router.get("/getPermissionByUserId/:userId", verifyToken, checkPermission("USERS_VIEW"), getUserPermissions);
router.put("/assignPermissionsByUserId/:userId", verifyToken, checkPermission("USERS_EDIT"), assignUserPermissions);

module.exports = router;

