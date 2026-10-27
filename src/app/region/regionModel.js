const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/dbConnection");

class Region extends Model {}

Region.init(
  {
    regionId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    regionName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    regionCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    primaryHubId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "hubs",
        key: "hubId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },

    addressLine1: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    addressLine2: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    state: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    country: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "India",
    },

    pincode: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    modelName: "Region",
    tableName: "regions",
    timestamps: true,
  }
);

module.exports = Region;
