// Restricts a route to one or more coarse-grained roles (Admin/HR/Manager/Employee).
// Must run after verifyToken, since it reads req.user set by the JWT middleware.
// SuperAdmin always passes, regardless of the roles list — it has blanket authority
// across every company/tenant, so it is never listed explicitly at each call site.
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    if (req.user.role === "SuperAdmin" || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "You do not have permission to perform this action",
    });
  };
}

module.exports = allowRoles;
