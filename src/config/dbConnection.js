const { Sequelize } = require("sequelize");
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: process.env.DIALECT || "postgres",
  logging: false,
});

module.exports = sequelize;
