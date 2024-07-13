const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite')
});

const Template = require('./Template')(sequelize);
const Screen = require('./Screen')(sequelize);
const Option = require('./Option')(sequelize);

// Set up associations
Template.hasMany(Screen, { foreignKey: 'templateId', as: 'screens' });
Screen.belongsTo(Template, { foreignKey: 'templateId' }); // Corrected this line

Screen.hasMany(Option, { foreignKey: 'screenId', as: 'options' });
Option.belongsTo(Screen, { foreignKey: 'screenId' });

Screen.belongsTo(Screen, { as: 'NextScreen', foreignKey: 'nextScreenId' });
Option.belongsTo(Screen, { as: 'NextScreen', foreignKey: 'nextScreenId' });
Template.belongsTo(Screen, { as: 'InitialScreen', foreignKey: 'initialScreenId' });

// Sync the models with the database
sequelize.sync({ alter: true })
  .then(() => console.log('Database & tables created!'))
  .catch(error => console.log('This error occurred', error));

module.exports = {
  sequelize,
  Template,
  Screen,
  Option
};