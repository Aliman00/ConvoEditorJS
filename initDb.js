const { sequelize } = require('./models');

async function initDb() {
  try {
    await sequelize.sync({ force: true });
    console.log('Database synchronized');
  } catch (error) {
    console.error('Unable to synchronize the database:', error);
  } finally {
    await sequelize.close();
  }
}

initDb();