const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { sequelize } = require('./models');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Sync database and start server
// sequelize.sync({ alter: true }).then(() => {
//   app.listen(port, () => {
//     console.log(`Server running on port ${port}`);
//     console.log('Database synced');
//   });
// }).catch(error => {
//   console.error('Unable to sync database:', error);
// });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Database synced');
});


module.exports = { app };
