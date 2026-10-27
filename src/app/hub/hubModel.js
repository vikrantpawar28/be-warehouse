const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/dbConnection");

class Hub extends Model {}

Hub.init(
  {
    hubId: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    hubName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    hubCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    hubType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "Fulfillment Center",
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
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

    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },

    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },

    contactPerson: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contactPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    contactEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    capacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    storageCapacity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    storageCapacityUnit: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "CBM",
    },

    erpLocationId: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    operatingHoursFrom: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    operatingHoursTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    operatingHours: {
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
    modelName: "Hub",
    tableName: "hubs",
    timestamps: true,
  }
);

module.exports = Hub;
