const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Template = sequelize.define('Template', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    stf_mode: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    stf_path_prefix: {
      type: DataTypes.STRING,
      defaultValue: '@conversation/'
    },
    initial_screen: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  });

  Template.associate = function(models) {
    Template.hasMany(models.Screen, { as: 'screens', foreignKey: 'templateId' });
  };

  return Template;
};
