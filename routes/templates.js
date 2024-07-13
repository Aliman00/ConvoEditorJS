const express = require('express');
const router = express.Router();
const { Template, Screen, Option } = require('../models');
const { templateToSchema, generateLuaScript, generateConvoHandler } = require('../utils/templateHelpers');

// List all templates
router.get('/', async (req, res) => {
  try {
    const templates = await Template.findAll();
    res.json(templates.map(template => templateToSchema(template, false)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get a specific template
router.get('/:id', async (req, res) => {
  try {
    console.log(`Fetching template with ID: ${req.params.id}`);
    const template = await Template.findByPk(req.params.id, {
      include: [
        {
          model: Screen,
          as: 'screens',
          include: [{ model: Option, as: 'options' }]
        }
      ]
    });
    if (!template) {
      console.log(`Template with ID ${req.params.id} not found`);
      return res.status(404).json({ error: "Template not found" });
    }
    const templateSchema = templateToSchema(template);
    // console.log('Template schema:', JSON.stringify(templateSchema, null, 2));
    res.json(templateSchema);
  } catch (err) {
    console.error('Error fetching template:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Create a new template
router.post('/', async (req, res) => {
  try {
    const { name, stf_mode, stf_path_prefix, initial_screen, screens } = req.body;
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: "Template name is required" });
    }
    
    if (screens.length === 0) {
      return res.status(400).json({ error: "At least one screen is required" });
    }

    const template = await Template.create({
      name,
      stf_mode,
      stf_path_prefix,
      initial_screen
    });

    for (const screenData of screens) {
      const screen = await Screen.create({
        ...screenData,
        templateId: template.id
      });

      for (const optionData of screenData.options) {
        await Option.create({
          ...optionData,
          screenId: screen.id
        });
      }
    }

    const createdTemplate = await Template.findByPk(template.id, {
      include: [
        {
          model: Screen,
          as: 'screens',
          include: [{ model: Option, as: 'options' }]
        }
      ]
    });

    res.status(201).json(templateToSchema(createdTemplate));
  } catch (err) {
    console.error('Error creating template:', err);
    if (err.name === 'SequelizeValidationError') {
      const validationErrors = err.errors.map(e => ({ field: e.path, message: e.message }));
      res.status(400).json({ error: "Validation error", details: validationErrors });
    } else {
      res.status(500).json({ error: "Internal server error", message: err.message });
    }
  }
});

// Update an existing template
router.put('/:id', async (req, res) => {
  try {
    const { name, stf_mode, stf_path_prefix, initial_screen, screens } = req.body;
    const template = await Template.findByPk(req.params.id);

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    await template.update({
      name,
      stf_mode,
      stf_path_prefix,
      initial_screen
    });

    // Delete existing screens and options
    await Option.destroy({ 
      where: {}, 
      include: [{
        model: Screen,
        where: { templateId: template.id }
      }]
    });
    await Screen.destroy({ where: { templateId: template.id } });

    // Create new screens and options
    for (const screenData of screens) {
      const screen = await Screen.create({
        ...screenData,
        templateId: template.id
      });

      for (const optionData of screenData.options) {
        await Option.create({
          ...optionData,
          screenId: screen.id
        });
      }
    }

    const updatedTemplate = await Template.findByPk(template.id, {
      include: [
        {
          model: Screen,
          as: 'screens',
          separate: true,
          include: [{ model: Option, as: 'options' }]
        }
      ]
    });

    res.json(templateToSchema(updatedTemplate));
  } catch (err) {
    console.error('Error updating template:', err);
    res.status(400).json({ error: err.message, stack: err.stack });
  }
});

// Delete a template
router.delete('/:id', async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    await template.destroy();
    res.json({ message: "Template deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Generate Lua script
router.get('/:id/lua', async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id, {
      include: [
        {
          model: Screen,
          as: 'screens',
          include: [{ model: Option, as: 'options' }]
        }
      ]
    });
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    // console.log('Template data:', JSON.stringify(template, null, 2));
    const luaScript = generateLuaScript(template);
    res.json({ lua_script: luaScript });
  } catch (err) {
    console.error('Error generating Lua script:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Generate ConvoHandler script
router.get('/:id/convo_handler', async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id, {
      include: [
        {
          model: Screen,
          as: 'screens',
          include: [{ model: Option, as: 'options' }]
        }
      ]
    });
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    const convoHandler = generateConvoHandler(template);
    res.json({ convo_handler: convoHandler });
  } catch (err) {
    console.error('Error generating ConvoHandler script:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
