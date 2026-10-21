
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/dbConnection");

class PurchaseOrderItem extends Model {}

PurchaseOrderItem.init(
  {
    purchaseOrderItemId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    purchaseOrderId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: "purchase_orders",
        key: "purchaseOrderId",
      },
    },

    erpItemCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notEmpty: true },
    },

    itemId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "Optional FK to internal Item model.",
    },

    itemDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    itemType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    orderedQuantity: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
      validate: { min: 0.001 },
    },

    receivedQuantity: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },

    uom: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: { notEmpty: true },
    },

    unitPrice: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: { min: 0 },
    },

    lineTotal: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "PurchaseOrderItem",
    tableName: "purchase_order_items",
    timestamps: true,
    indexes: [
      { fields: ["purchaseOrderId"] },
      { fields: ["erpItemCode"] },
    ],
    validate: {
      validReceiptQuantity() {
        if (
          Number(this.receivedQuantity) >
          Number(this.orderedQuantity)
        ) {
          throw new Error(
            "Received quantity cannot exceed ordered quantity."
          );
        }
      },
    },
    hooks: {
      beforeValidate(item) {
        if (
          item.orderedQuantity != null &&
          item.unitPrice != null
        ) {
          item.lineTotal = (
            Number(item.orderedQuantity) *
            Number(item.unitPrice)
          ).toFixed(2);
        }
      },
    },
  }
);

module.exports = PurchaseOrderItem;
