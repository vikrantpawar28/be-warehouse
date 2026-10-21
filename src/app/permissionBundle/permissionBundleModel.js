const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../../config/dbConnection");

// A curated, named, SNAPSHOTTED list of permissions — sugar for "grant these N explicit
// permissions together," never a live wildcard/prefix match (e.g. never "Employees.*"
// evaluated fresh on every check). Applying a bundle to a role inserts explicit
// RolePermission rows; a permission added to the module later is not retroactively usable
// through an old grant of this bundle. See RolePermission.sourceBundleId.
class PermissionBundle extends Model {}
class PermissionBundleItem extends Model {}

PermissionBundle.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

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

    // Null for platform-wide bundles (e.g. "Employee Management") available to every
    // company; set for a company-specific curated bundle a Company Admin builds for
    // themselves out of permissions they're authorized to delegate.
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "companies", key: "companyId" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
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
    modelName: "PermissionBundle",
    tableName: "permission_bundles",
    timestamps: true,
  }
);

PermissionBundleItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    bundleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "permission_bundles", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },

    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "permissions", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "PermissionBundleItem",
    tableName: "permission_bundle_items",
    timestamps: true,
    indexes: [{ unique: true, fields: ["bundleId", "permissionId"] }],
  }
);

module.exports = { PermissionBundle, PermissionBundleItem };
