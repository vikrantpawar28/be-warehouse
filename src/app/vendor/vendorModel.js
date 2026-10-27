const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/dbConnection");

class Vendor extends Model { }

Vendor.init(
  {
    vendorId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },

    vendorCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 20],
      },
    },

    vendorName: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 150],
      },
    },

    gstin: {
      type: DataTypes.STRING(15),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [15, 15],
      },
    },

    contactDetails: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    registeredAddress: {
      type: DataTypes.JSON,
      allowNull: false,
    },

    vendorCategory: {
      type: DataTypes.ENUM(
        "Print Vendor",
        "POSM Fabricator",
        "Gift Manufacturer",
        "Packaging Vendor",
        "Consumables"
      ),
      allowNull: false,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    createdBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: "users",
        key: "userId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    updatedBy: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: "users",
        key: "userId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
  },
  {
    sequelize,
    modelName: "Vendor",
    tableName: "vendors",
    timestamps: true,
    indexes: [
      { fields: ["vendorCode"], unique: true },
      { fields: ["gstin"], unique: true },
      { fields: ["vendorCategory"] },
      { fields: ["isActive"] },
      { fields: ["vendorName"] },
    ],
  }
);

module.exports = Vendor;