const express = require('express');
const router = express.Router();

const templatesRouter = require('./templates');
const stfRouter = require('./stf');

router.use('/templates', templatesRouter);
router.use('/templates/stf', stfRouter);

module.exports = router;
