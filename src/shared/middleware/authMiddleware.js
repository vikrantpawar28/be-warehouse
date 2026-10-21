const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const checkPermission = (requiredPermissionCode) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // SuperAdmin or system role has global bypass
    if (req.user.isSuperAdmin || req.user.roleCode === "SUPER_ADMIN") {
      return next();
    }

    const permissions = req.user.permissions || [];
    if (!permissions.includes(requiredPermissionCode)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Missing required permission '${requiredPermissionCode}'`,
      });
    }

    return next();
  };
};

const applyLocationScope = (req, baseWhere = {}) => {
  const user = req.user;
  if (!user) return baseWhere;

  // 1. SuperAdmin: Sees all hubs/regions (unless they explicitly pass a filter in UI)
  if (user.isSuperAdmin || user.roleCode === "SUPER_ADMIN") {
    if (req.headers && req.headers["x-hub-id"]) {
      baseWhere.hubId = req.headers["x-hub-id"];
    }
    return baseWhere;
  }

  // 2. Hub Admin / Hub User: Strictly locked to their assigned hubId
  if (user.hubId) {
    baseWhere.hubId = user.hubId;
    return baseWhere;
  }

  // 3. Region Admin: Locked to their assigned regionId
  if (user.regionId) {
    baseWhere.regionId = user.regionId;
    return baseWhere;
  }

  return baseWhere;
};

module.exports = {
  JWT_SECRET,
  verifyToken,
  checkPermission,
  applyLocationScope,
};
