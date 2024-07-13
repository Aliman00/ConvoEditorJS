const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Screen = sequelize.define('Screen', {
    id_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    custom_dialog_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    leftDialog: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stop_conversation: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    task_action: {
      type: DataTypes.STRING,
      allowNull: true
    },
    task_reaction: {
      type: DataTypes.STRING,
      allowNull: true
    },
    task_title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    task_description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  Screen.associate = function(models) {
    Screen.belongsTo(models.Template, { as: 'template', foreignKey: 'templateId' });
    Screen.hasMany(models.Option, { as: 'options', foreignKey: 'screenId' });
  };

  return Screen;
};
