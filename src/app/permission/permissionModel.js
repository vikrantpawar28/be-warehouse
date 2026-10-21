const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../../config/dbConnection");

// The real, global permission catalog — every business capability the app can gate,
// defined once and referenced by many roles via RolePermission. Distinct from the old
// (roleModel.js) Permission/ApiPermission tables, which modeled "a role's grant" rather
// than a catalog entry and were never actually read by any authorization check; those were
// renamed to legacy_role_service_permissions/legacy_api_permissions rather than reused.
class Permission extends Model {}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // Canonical business identity, e.g. "Employees.VIEW", "Payroll.APPROVE" — this is what
    // requirePermission() and every RolePermission row actually reference.
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    moduleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "modules", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    // e.g. "Employees" — the noun half of "Employees.VIEW".
    resource: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // e.g. "VIEW" — the verb half. Kept separate from `code` so the catalog UI can group/
    // filter by action across resources without string-splitting the code everywhere.
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Platform-defined (seeded by a migration), not creatable/renamable via the tenant
    // Role/Permission admin UI.
    isSystem: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    // Hard floor, independent of the AssignablePermission delegation table's own data —
    // seeded false for SuperAdmin.*/Platform.*/Security.*/Delegation.*/Company.Delete and
    // enforced as immutable for those codes by the permission-metadata service (never just
    // a seed default a later data fix could quietly override). See AssignablePermission.
    isDelegable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "userId" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "users", key: "userId" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
  },
  {
    sequelize,
    modelName: "Permission",
    tableName: "permissions",
    timestamps: true,
  }
);

module.exports = Permission;
