const { DataTypes } = require("sequelize");
const sequelize = require("../../../config/dbConnection");
const { encryptedField } = require("../../../shared/utils/encryptedSequelizeField");

const AuditLog = sequelize.define(
  "AuditLog",
  {
    auditLogId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    userEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // The actor's own company context at the time of the action.
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // Populated only when this action crossed a tenant boundary (a Super Admin acting on a
    // company other than their own home context) — distinct from companyId so a
    // cross-tenant event is unambiguous without inferring it from role name. Null for every
    // ordinary same-tenant action.
    targetCompanyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    action: {
      type: DataTypes.STRING, // POST, PUT, DELETE
      allowNull: false,
    },

    // Named domain event for the new authorization-management vocabulary (e.g. "Role
    // Created", "Delegation Permission Changed", "Self-Assignment Performed", "Cross-Tenant
    // Access by Super Admin"). Deliberately a separate column from `action` above, which
    // holds the HTTP verb for the generic auto-diff middleware (auditLogger.js) — the two
    // vocabularies would collide if merged into one column.
    eventType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    entityName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    payload: encryptedField("AuditLog", "payload", { format: "json" }),
    // Field-level before/after diff for updates/deletes on registered models, e.g.
    // { salary: { before: 50000, after: 55000 } }. Null when the entity isn't registered
    // for diffing (see auditModelRegistry.js) or nothing changed.
    changes: encryptedField("AuditLog", "changes", { format: "json" }),
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Who created this row — see the universal createdBy rollout.
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // Who last modified this row.
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "audit_logs",
    schema: "public",
    timestamps: true,
    updatedAt: false, // Audit logs don't get updated
  }
);

module.exports = AuditLog;
