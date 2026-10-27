// const express = require("express");
// const router = express.Router();
// const controller = require("./auditLogController");
// const verifyToken = require("../../../shared/middleware/jwtToken");
// const allowRoles = require("../../../shared/middleware/allowRoles");
// const { requirePermission } = require("../../../shared/services/authorization/requirePermission");
// const checkPermission = require("../../../shared/middleware/permissionCheck");

// router.use(verifyToken);
// router.use(allowRoles("Admin", "SuperAdmin")); // Strict access

// router.post("/getAllAuditLogs", requirePermission("AuditLogs.VIEW"), checkPermission({ shadow: true, shadowExpectedRoles: ["Admin","SuperAdmin"] }), controller.getAllAuditLogs);
// router.get("/getAuditLogById/:auditLogId", requirePermission("AuditLogs.VIEW"), checkPermission({ shadow: true, shadowExpectedRoles: ["Admin","SuperAdmin"] }), controller.getAuditLogById);

// module.exports = router;
