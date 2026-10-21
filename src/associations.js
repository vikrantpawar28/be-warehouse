const Region = require("./app/region/regionModel");
const Hub = require("./app/hub/hubModel");
const User = require("./app/user/userModel");
const { Role, Permission, ApiPermission, RolePermission } = require("./app/role/roleModel");

const applyAssociations = () => {
  // Region & Hub
  Region.belongsTo(Hub, { foreignKey: "primaryHubId", as: "primaryHub" });

  // User relationships
  User.belongsTo(Role, { foreignKey: "roleId", as: "role" });
  Role.hasMany(User, { foreignKey: "roleId", as: "users" });

  User.belongsTo(Hub, { foreignKey: "hubId", as: "hub" });
  Hub.hasMany(User, { foreignKey: "hubId", as: "users" });

  User.belongsTo(Region, { foreignKey: "regionId", as: "region" });
  Region.hasMany(User, { foreignKey: "regionId", as: "users" });

  // Role <-> Permission
  Role.belongsToMany(Permission, {
    through: RolePermission,
    foreignKey: "roleId",
    otherKey: "permissionId",
    as: "permissions",
  });
  Permission.belongsToMany(Role, {
    through: RolePermission,
    foreignKey: "permissionId",
    otherKey: "roleId",
    as: "roles",
  });

  // Permission <-> ApiPermission
  Permission.hasMany(ApiPermission, { foreignKey: "permissionId", as: "apiEndpoints" });
  ApiPermission.belongsTo(Permission, { foreignKey: "permissionId", as: "permission" });
};

module.exports = applyAssociations;

