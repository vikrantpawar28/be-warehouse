
const { DataTypes, Model } = require("sequelize");
const sequelize = require("../../config/dbConnection");

class User extends Model {}

User.init(
  {
    userId: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    firstName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.firstName || ""} ${this.lastName || ""}`.trim();
      },
      set(value) {
        if (value) {
          const parts = value.trim().split(" ");
          this.setDataValue("firstName", parts[0] || "");
          this.setDataValue("lastName", parts.slice(1).join(" ") || "");
        }
      },
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    profilePhoto: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    roleId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: { model: "roles", key: "roleId" },
    },
    hubId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: "hubs", key: "hubId" },
    },
    regionId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: { model: "regions", key: "regionId" },
    },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["email"] },
      { fields: ["roleId"] },
      { fields: ["hubId"] },
      { fields: ["regionId"] },
      { fields: ["status"] },
    ],
  }
);

module.exports = User;

