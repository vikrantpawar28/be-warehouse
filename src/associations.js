const Region = require("./app/region/regionModel");
const Hub = require("./app/hub/hubModel");
const User = require("./app/user/userModel");
const { Role, Permission, ApiPermission, RolePermission } = require("./app/role/roleModel");
const PurchaseOrder = require("./app/purchaseOrder/purchaseOrderModel");
const PurchaseOrderItem = require("./app/purchaseOrder/purchaseOrderItemModel");
const Vendor = require("./app/vendor/vendorModel");

const applyAssociations = () => {
  // Region & Hub
  Region.hasMany(Hub, { foreignKey: "regionId", as: "hubs" });
  Hub.belongsTo(Region, { foreignKey: "regionId", as: "region" });
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

  // PurchaseOrder relationships
  PurchaseOrder.belongsTo(Hub, { foreignKey: "hubId", as: "hub" });
  Hub.hasMany(PurchaseOrder, { foreignKey: "hubId", as: "purchaseOrders" });

  PurchaseOrder.belongsTo(Region, { foreignKey: "regionId", as: "region" });
  Region.hasMany(PurchaseOrder, { foreignKey: "regionId", as: "purchaseOrders" });

  PurchaseOrder.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  PurchaseOrder.belongsTo(User, { foreignKey: "updatedBy", as: "updater" });

  PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: "purchaseOrderId", as: "items", onDelete: "CASCADE" });
  PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: "purchaseOrderId", as: "purchaseOrder" });

  // Vendor relationships
  PurchaseOrder.belongsTo(Vendor, { foreignKey: "vendorId", as: "vendor" });
  Vendor.hasMany(PurchaseOrder, { foreignKey: "vendorId", as: "purchaseOrders" });

  Vendor.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
  Vendor.belongsTo(User, { foreignKey: "updatedBy", as: "updater" });
};

module.exports = applyAssociations;


