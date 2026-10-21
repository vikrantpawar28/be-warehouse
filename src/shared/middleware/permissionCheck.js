const permissionCache = require("../utils/permissionCache");

// Data-driven replacement for allowRoles(...) — reads api_permissions (seeded from the
// historical allowRoles() call sites, see scripts/seedApiPermissionsFromAllowRoles.js)
// instead of a role list hardcoded at the call site. Must run after verifyToken (reads
// req.user) and be passed as a route-level middleware argument, not router.use() — it
// needs req.route.path, which Express only sets once a specific route has matched.
//
// `shadow: true` never blocks the request; it only logs a mismatch against what the
// (still-present) allowRoles(...) at this call site would have decided, so the seeded
// permission data can be verified against real traffic before actually swapping
// enforcement over. Pass the same role list this route's allowRoles(...) call uses as
// `shadowExpectedRoles` so the comparison has something to check against.
function checkPermission({ shadow = false, shadowExpectedRoles = [] } = {}) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    const routePath = (req.baseUrl || "") + (req.route?.path || "");
    let allowed = false;
    try {
      allowed = req.user.role === "SuperAdmin" || (await permissionCache.isAllowed(req.user.roleId, req.method, routePath));
    } catch (err) {
      console.error("checkPermission: permission lookup failed:", err.message);
    }

    if (shadow) {
      const legacyAllowed = req.user.role === "SuperAdmin" || shadowExpectedRoles.includes(req.user.role);
      if (allowed !== legacyAllowed) {
        console.warn(
          `[permissionCheck:shadow] mismatch on ${req.method} ${routePath} for role "${req.user.role}": ` +
            `new=${allowed} legacy=${legacyAllowed}`
        );
      }
      return next(); // shadow mode never blocks — allowRoles() still enforces at this call site
    }

    if (allowed) return next();
    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action",
    });
  };
}

module.exports = checkPermission;
