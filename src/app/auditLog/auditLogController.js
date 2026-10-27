const { Op } = require("sequelize");
const AuditLog = require("./auditLogModel");
const User = require("../user/userModel");
const { isSuperAdmin, scopeToCompany, isForeignCompany } = require("../../../shared/utils/companyScope");
const Employee = require("../employee/employeeModel");

// entityName/recordId are optional — omitted, this behaves exactly as before (unfiltered,
// used by the general Audit Logs page). Passing both scopes it to one specific record's
// trail (e.g. "View Trail" on a Salary Structure row) — endpoint is the only place the
// record id is captured today (see auditLogger.js), so it's matched by suffix instead of a
// dedicated column.
exports.getAllAuditLogs = async (req, res) => {
  try {
    let { start = 0, limit = 50, order = "DESC", entityName, recordId } = req.body;
    start = parseInt(start);
    limit = parseInt(limit);

    const where = {};
    if (entityName) where.entityName = entityName;
    if (recordId) where.endpoint = { [Op.like]: `%/${recordId}` };

    const logs = await AuditLog.findAndCountAll({
      where,
      offset: start,
      limit,
      order: [["createdAt", order.toUpperCase() === "ASC" ? "ASC" : "DESC"]],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "email"],
          required: !isSuperAdmin(req.user),
          where: scopeToCompany(req.user),
        },
        { model: User, as: "creator", attributes: ["userId", "username"], include: [{ model: Employee, as: "employee", attributes: ["fullName"] }] }, { model: User, as: "modifier", attributes: ["userId", "username"], include: [{ model: Employee, as: "employee", attributes: ["fullName"] }] },
      ],
    });

    return res.status(200).json({
      success: true,
      total: logs.count,
      start,
      limit,
      data: logs.rows,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuditLogById = async (req, res) => {
  try {
    const { auditLogId } = req.params;
    const log = await AuditLog.findByPk(auditLogId, {
      include: [{ model: User, as: "user", attributes: ["userId", "email", "companyId"] }],
    });

    if (!log) {
      return res.status(404).json({ success: false, message: "Audit log not found" });
    }

    if (!isSuperAdmin(req.user) && isForeignCompany(req.user, log.user?.companyId)) {
      return res.status(404).json({ success: false, message: "Audit log not found" });
    }

    return res.status(200).json({ success: true, data: log });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
