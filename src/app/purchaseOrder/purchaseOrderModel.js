
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/dbConnection");

class PurchaseOrder extends Model {}

PurchaseOrder.init(
  {
    purchaseOrderId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    erpPONumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: { notEmpty: true, len: [1, 50] },
      comment: "Purchase order number from ERP.",
    },

    vendorId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: "vendors", key: "vendorId" },
    },

    poDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    targetDestinationType: {
      type: DataTypes.ENUM("HUB", "REGION"),
      allowNull: false,
    },

    hubId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "hubs", key: "hubId" },
    },

    regionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "regions", key: "regionId" },
    },

    targetDestinationName: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: "Destination label from ERP, if provided.",
    },

    expectedDeliveryDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "ISSUED",
        "PARTIALLY_RECEIVED",
        "RECEIVED",
        "CLOSED",
        "CANCELLED"
      ),
      allowNull: false,
      defaultValue: "ISSUED",
    },

    totalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },

    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: "users", key: "userId" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    updatedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: "users", key: "userId" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
  },
  {
    sequelize,
    modelName: "PurchaseOrder",
    tableName: "purchase_orders",
    timestamps: true,
    indexes: [
      { fields: ["erpPONumber"] },
      { fields: ["vendorId"] },
      { fields: ["hubId"] },
      { fields: ["regionId"] },
      { fields: ["status"] },
      { fields: ["poDate"] },
    ],
    validate: {
      validDestination() {
        if (
          this.targetDestinationType === "HUB" &&
          (this.hubId == null || this.regionId != null)
        ) {
          throw new Error(
            "For HUB destination, provide hubId only."
          );
        }

        if (
          this.targetDestinationType === "REGION" &&
          (this.regionId == null || this.hubId != null)
        ) {
          throw new Error(
            "For REGION destination, provide regionId only."
          );
        }
      },
    },
  }
);

module.exports = PurchaseOrder;
