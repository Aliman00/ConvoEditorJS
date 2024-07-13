// Option.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Option = sequelize.define('Option', {
    text: {
      type: DataTypes.STRING,
      allowNull: false
    },
    stfReference: {
      type: DataTypes.STRING,
      allowNull: true
    },
    next_screen: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  });

  return Option;
};