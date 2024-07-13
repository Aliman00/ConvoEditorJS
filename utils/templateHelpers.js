const templateToSchema = (template, includeScreens = true) => {
  const result = {
    id: template.id,
    name: template.name,
    stf_mode: template.stf_mode,
    stf_path_prefix: template.stf_path_prefix,
    initial_screen: template.initial_screen,
  };

  if (includeScreens && template.screens) {
    result.screens = template.screens.map(screen => ({
      id: screen.id,
      id_name: screen.id_name,
      custom_dialog_text: screen.custom_dialog_text,
      leftDialog: screen.leftDialog,
      stop_conversation: screen.stop_conversation,
      task_action: screen.task_action,
      task_reaction: screen.task_reaction,
      task_title: screen.task_title,
      task_description: screen.task_description,
      options: screen.options ? screen.options.map(option => ({
        id: option.id,
        text: option.text,
        stfReference: option.stfReference,
        next_screen: option.next_screen_id
      })) : []
    }));
  }

  return result;
};

const generateLuaScript = (template) => {
  try {
    let lua_script = `${template.name}_convo_template = ConvoTemplate:new {\n`;
    lua_script += `    initialScreen = "${template.initial_screen?.id_name || template.screens[0]?.id_name || ''}",\n`;
    lua_script += `    templateType = "Lua",\n`;
    lua_script += `    luaClassHandler = "${template.name}_convo_handler",\n`;
    lua_script += `    screens = {}\n`;
    lua_script += `}\n\n`;

    template.screens.forEach(screen => {
      lua_script += `${screen.id_name} = ConvoScreen:new {\n`;
      lua_script += `    id = "${screen.id_name}",\n`;

      if (template.stf_mode && screen.leftDialog) {
        lua_script += `    leftDialog = "${screen.leftDialog}", -- ${screen.custom_dialog_text}\n`;
      } else {
        lua_script += `    customDialogText = "${screen.custom_dialog_text}",\n`;
      }

      lua_script += `    stopConversation = "${screen.stop_conversation.toString().toLowerCase()}",\n`;
      lua_script += `    options = {\n`;

      screen.options.forEach((option, index, options) => {
        const option_text = template.stf_mode && option.stfReference ? option.stfReference : option.text;
        let optionString = `        {"${option_text}"`;
        
        if (option.next_screen) {
          const nextScreen = template.screens.find(s => s.id === option.next_screen);
          optionString += `, "${nextScreen ? nextScreen.id_name : ''}"`;
        } else {
          optionString += `, ""`;
        }
        
        optionString += `}`;

        if (index < options.length - 1) {
          optionString += ',';
        }

        if (template.stf_mode) {
          optionString += ` -- ${option.text}`;
        }

        lua_script += optionString + '\n';
      });

      lua_script += `    }\n`;
      lua_script += `}\n`;
      lua_script += `${template.name}_convo_template:addScreen(${screen.id_name});\n\n`;
    });

    lua_script += `addConversationTemplate("${template.name}_convo_template", ${template.name}_convo_template);\n`;

    return lua_script;
  } catch (error) {
    console.error('Error in generateLuaScript:', error);
    throw new Error(`Failed to generate Lua script: ${error.message}`);
  }
};

const generateConvoHandler = (template) => {
  try {
    const handler_name = `${template.name}_convo_handler`;
    let lua_script = `local QuestManager = require("managers.quest.quest_manager")\n\n`;
    lua_script += `${handler_name} = conv_handler:new {}\n\n`;

    // getInitialScreen function
    lua_script += `function ${handler_name}:getInitialScreen(pPlayer, pNpc, pConvTemplate)\n`;
    lua_script += `    local convoTemplate = LuaConversationTemplate(pConvTemplate)\n`;
    lua_script += `    local playerID = SceneObject(pPlayer):getObjectID()\n`;
    lua_script += `    local player = LuaCreatureObject(pPlayer)\n`;
    lua_script += `    local pGhost = CreatureObject(pPlayer):getPlayerObject()\n\n`;

    // Generate quest checks
    const quest_checks = template.screens
      .filter(screen => screen.task_action && screen.task_action.startsWith('has'))
      .map((screen, index) => {
        const condition = index === 0 ? 'if' : 'elseif';
        return `    ${condition} QuestManager.${screen.task_action}(pPlayer, QuestManager.quests.${screen.task_reaction.toUpperCase()}) then\n` +
               `        return convoTemplate:getScreen("${screen.id_name}")\n`;
      });

    // Add quest checks to lua_script
    if (quest_checks.length > 0) {
      lua_script += quest_checks.join('');
      lua_script += `\n    else\n`;
      lua_script += `        return convoTemplate:getScreen("${template.initial_screen?.id_name || template.screens[0]?.id_name || ''}")\n\n`;
      lua_script += `    end\n`;
    } else {
      lua_script += `    return convoTemplate:getScreen("${template.initial_screen?.id_name || template.screens[0]?.id_name || ''}")\n`;
    }

    lua_script += `end\n\n`;

    // runScreenHandlers function
    lua_script += `function ${handler_name}:runScreenHandlers(pConvTemplate, pPlayer, pNpc, selectedOption, pConvScreen)\n`;
    lua_script += `    local screen = LuaConversationScreen(pConvScreen)\n`;
    lua_script += `    local screenID = screen:getScreenID()\n`;
    lua_script += `    local playerID = CreatureObject(pPlayer):getObjectID()\n`;
    lua_script += `    local pGhost = CreatureObject(pPlayer):getPlayerObject()\n\n`;
    lua_script += `    if not SceneObject(pPlayer):isPlayerCreature() then\n`;
    lua_script += `        return 0\n`;
    lua_script += `    end\n\n`;
    lua_script += `    if (pGhost == nil) then\n`;
    lua_script += `        return 0\n`;
    lua_script += `    end\n\n`;

    // Add screen handlers
    const screen_handlers = template.screens
      .filter(screen => screen.task_action && !screen.task_action.startsWith('has'))
      .map((screen, index) => {
        const condition = index === 0 ? 'if' : 'elseif';
        return `    ${condition} screenID == "${screen.id_name}" then\n` +
              `        QuestManager.${screen.task_action}(pPlayer, QuestManager.quests.${screen.task_reaction.toUpperCase()})\n`;
      });

    if (screen_handlers.length > 0) {
      lua_script += screen_handlers.join('');
      lua_script += `\n    end\n`;
    }

    lua_script += `\n    return pConvScreen\n`;
    lua_script += `end\n`;

    return lua_script;
  } catch (error) {
    console.error('Error in generateConvoHandler:', error);
    throw new Error(`Failed to generate ConvoHandler script: ${error.message}`);
  }
};

module.exports = {
  templateToSchema,
  generateLuaScript,
  generateConvoHandler
};
