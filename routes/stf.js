const express = require('express');
const router = express.Router();
const STFWriter = require('../utils/stfwriter');

// Create STF file
router.post('/', (req, res) => {
  const { templateName, data } = req.body;
  const writer = new STFWriter();
  const stfBuffer = writer.saveData(data);
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${templateName}.stf"`);
  res.send(Buffer.from(stfBuffer));
});

// Create STF task file
router.post('/task', (req, res) => {
  const { data } = req.body;
  const writer = new STFWriter();
  
  const formattedData = Object.entries(data).flatMap(([key, value]) => {
    const index = key.padStart(2, '0');
    return [
      [`task${index}_journal_entry_title`, value.title],
      [`task${index}_journal_entry_description`, value.description]
    ];
  });

  const stfBuffer = writer.saveData(formattedData);
  
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="STFData.stf"');
  res.send(Buffer.from(stfBuffer));
});

module.exports = router;
