const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/dbConnection");

class Role extends Model {}

Role.init(
  {
    roleId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    roleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    roleCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isSystemRole: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
  },
  {
    sequelize,
    modelName: "Role",
    tableName: "roles",
    timestamps: true,
  }
);
class Permission extends Model {}

Permission.init(
  {
    permissionId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    moduleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    moduleCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    permissionName: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    permissionCode: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    action: {
      type: DataTypes.ENUM(
        "VIEW",
        "CREATE",
        "EDIT",
        "DELETE",
        "EXPORT"
      ),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Permission",
    tableName: "permissions",
    timestamps: true,
    indexes: [
      { fields: ["moduleCode"] },
      { unique: true, fields: ["moduleCode", "action"] },
    ],
  }
);
class ApiPermission extends Model {}

ApiPermission.init(
  {
    apiPermissionId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    permissionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: "permissions", key: "permissionId" },
      onDelete: "CASCADE",
    },
    apiPath: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    httpMethod: {
      type: DataTypes.ENUM("GET", "POST", "PUT", "DELETE", "PATCH", "ALL"),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "ApiPermission",
    tableName: "api_permissions",
    timestamps: true,
    indexes: [
      { fields: ["apiPath", "httpMethod"] },
      { fields: ["permissionId"] },
      { fields: ["category"] },
    ],
  }
);

class RolePermission extends Model {}

RolePermission.init(
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    roleId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: "roles", key: "roleId" },
      onDelete: "CASCADE",
    },
    permissionId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: "permissions", key: "permissionId" },
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "RolePermission",
    tableName: "role_permissions",
    timestamps: true,
    indexes: [{ unique: true, fields: ["roleId", "permissionId"] }],
  }
);

module.exports = { Role, Permission, ApiPermission, RolePermission };

