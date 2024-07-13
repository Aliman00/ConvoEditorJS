
function templateEditor() {
    return {
        // State variables
        templateId: null,
        templateName: '',
        screens: [],
        selectedScreen: null,
        currentScreen: { options: [] },
        luaScript: '',
        convoHandler: '',
        templates: [],
        selectedTemplateId: '',
        stfMode: false,
        stfData: {},
        stfFile: null,
        stfPathPrefix: '',

        darkMode: document.documentElement.classList.contains('dark'),

        // Imported "modules"
        ...TemplateManager,
        ...ScreenManager,
        ...STFManager,
        ...LuaGenerator,

        init() {
            this.fetchTemplates().catch(error => {
                console.error('Failed to fetch templates on init:', error);
            });

            this.$watch('darkMode', val => {
                localStorage.setItem('darkMode', val);
                if (val) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            });

            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                this.darkMode = e.matches;
            });
        },

        toggleDarkMode() {
            this.darkMode = !this.darkMode;
        },

        hasTaskActions() {
            return this.screens.some(screen => screen.task_action !== '');
        },

        getAllTaskTitles() {
            const taskTitles = [];
            let orderNr = 0;
            this.screens.forEach(screen => {
                if (screen.task_action === 'activateTask' && screen.task_title) {
                    const paddedOrderNr = String(orderNr).padStart(2, '0');
                    taskTitles.push({
                        title: screen.task_title,
                        value: `${this.templateName}_${paddedOrderNr}`
                    });
                    orderNr++;
                }
            });
            return taskTitles;
        },

        resetEditorState() {
            this.selectedTemplateId = '';
            this.templateId = null;
            this.templateName = '';
            this.screens = [];
            this.selectedScreen = null;
            this.currentScreen = { options: [] };
            this.luaScript = '';
            this.convoHandler = '';
            this.stfMode = false;
            this.stfData = {};
            this.stfFile = null;
            this.stfPathPrefix = '';
        },
    };
}

const TemplateManager = {
    async fetchTemplates() {
        try {
            const response = await fetch('/api/templates');
            if (!response.ok) {
                throw new Error(`Failed to fetch templates: ${response.status} ${response.statusText}`);
            }
            this.templates = await response.json();
        } catch (error) {
            console.error('Error fetching templates:', error);
            alert(`Error fetching templates: ${error.message}`);
        }
    },

    async loadTemplate() {
        if (!this.selectedTemplateId) {
            alert('Please select a template');
            return;
        }
    
        try {
            // console.log(`Fetching template with ID: ${this.selectedTemplateId}`);
            const response = await fetch(`/api/templates/${this.selectedTemplateId}`);
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', response.status, response.statusText, errorText);
                throw new Error(`Failed to load template: ${response.status} ${response.statusText}\n${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Unexpected content type: ${contentType}`);
            }

            const template = await response.json();
            console.log('Loaded template:', template);

            if (!template || typeof template !== 'object') {
                throw new Error('Invalid template data received');
            }

            this.templateId = template.id;
            this.templateName = template.name;
            this.screens = template.screens || [];
            this.selectedScreen = null;
            this.currentScreen = { options: [] };
            this.stfMode = template.stf_mode;
            this.stfPathPrefix = template.stf_path_prefix || '@conversation/';
            
            if (template.stf_mode) {
                this.stfData = {};
                this.screens.forEach(screen => {
                    if (screen.leftDialog) {
                        const leftDialogId = screen.leftDialog.split(':')[1];
                        this.stfData[leftDialogId] = screen.custom_dialog_text;
                    }
                    screen.options.forEach(option => {
                        if (option.stfReference) {
                            const optionTextId = option.stfReference.split(':')[1];
                            this.stfData[optionTextId] = option.text;
                        }
                    });
                });
            } else {
                this.stfData = {};
            }
            
            await this.generateLua();
            await this.generateConvoHandler();
        } catch (error) {
            console.error('Error loading template:', error);
            alert(`Error loading template: ${error.message}`);
        }
    },

    async deleteTemplate() {
        if (!this.selectedTemplateId) {
            alert('Please select a template to delete');
            return;
        }
    
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }
    
        try {
            const response = await fetch(`/api/templates/${this.selectedTemplateId}`, {
                method: 'DELETE',
            });
    
            if (!response.ok) {
                throw new Error('Failed to delete template');
            }
    
            alert('Template deleted successfully');
            this.resetEditorState();
            await this.fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert(`Error deleting template: ${error.message}`);
        }
    },

    async saveTemplate() {
        if (this.stfMode) {
            const oldPrefix = this.screens[0].leftDialog.split(':')[0];
            if (this.stfPathPrefix !== oldPrefix) {
                this.screens = this.screens.map(screen => ({
                    ...screen,
                    leftDialog: `${this.stfPathPrefix}${this.templateName}:${screen.leftDialog.split(':')[1]}`,
                    options: screen.options.map(option => ({
                        ...option,
                        stfReference: option.stfReference ? `${this.stfPathPrefix}${this.templateName}:${option.stfReference.split(':')[1]}` : null
                    }))
                }));
            }
        }

        const template = {
            id: this.templateId,
            name: this.templateName,
            stf_mode: this.stfMode,
            stf_path_prefix: this.stfPathPrefix,
            initial_screen: this.screens.length > 0 ? this.screens[0].id : null,
            screens: this.screens.map(screen => ({
                id: screen.id,
                id_name: screen.id_name,
                task_action: screen.task_action,
                task_reaction: screen.task_reaction,
                task_title: screen.task_title,
                task_description: screen.task_description,
                custom_dialog_text: screen.custom_dialog_text,
                leftDialog: screen.leftDialog,
                stop_conversation: screen.stop_conversation,
                options: screen.options.map(option => ({
                    id: option.id,
                    text: option.text,
                    stfReference: option.stfReference,
                    next_screen: option.next_screen
                }))
            }))
        };

        console.log('Sending template data:', JSON.stringify(template, null, 2));
    
        const url = this.templateId ? `/api/templates/${this.templateId}` : '/api/templates';
        const method = this.templateId ? 'PUT' : 'POST';
    
        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(template),
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server error response:', errorData);
                throw new Error(`Server error: ${response.status} ${response.statusText}\n${JSON.stringify(errorData, null, 2)}`);
            }
    
            const responseData = await response.json();
            console.log('Response:', response.status, responseData);
    
            if (!this.templateId) {
                this.templateId = responseData.id;
            }
    
            if (this.stfMode) {
                this.screens = this.screens.map(screen => ({
                    ...screen,
                    leftDialog: `${this.stfPathPrefix}${this.templateName}:${screen.leftDialog.split(':')[1]}`,
                    options: screen.options.map(option => ({
                        ...option,
                        stfReference: option.stfReference ? `${this.stfPathPrefix}${this.templateName}:${option.stfReference.split(':')[1]}` : null
                    }))
                }));
            }
    
            alert('Template saved successfully');
            await this.fetchTemplates();
            await this.generateLua();
            await this.generateConvoHandler();
        } catch (error) {
            console.error('Error saving template:', error);
            alert(`Error saving template: ${error.message}`);
        }
    },
};

const ScreenManager = {
    addScreenForOption(optionIndex) {
        const newScreen = this.addScreen();
        this.currentScreen.options[optionIndex].next_screen = newScreen.id;
        this.saveScreen();
        this.selectScreen(newScreen.id);
    },

    addScreen() {
        const newScreen = {
            id: Date.now(),
            id_name: `screen_${this.screens.length + 1}`,
            task_action: '',
            task_reaction: '',
            task_title: '',
            task_description: '',
            custom_dialog_text: '',
            leftDialog: '',
            stop_conversation: false,
            options: []
        };
        if (this.stfMode) {
            const leftDialogId = `s_${this.generateUniqueId()}`;
            this.stfData[leftDialogId] = '';
            newScreen.leftDialog = `@conversation/${this.templateName}:${leftDialogId}`;
        }
        this.screens.push(newScreen);
        return newScreen;
    },

    getScreenName(screenId) {
        const screen = this.screens.find(s => s.id === screenId);
        return screen ? screen.id_name : 'Unknown Screen';
    },

    selectScreen(id) {
        this.selectedScreen = id;
        this.currentScreen = JSON.parse(JSON.stringify(this.screens.find(s => s.id === id)));
    },

    addOption() {
        const newOption = { text: '', next_screen: null };
        if (this.stfMode) {
            const optionTextId = `s_${this.generateUniqueId()}`;
            this.stfData[optionTextId] = '';
            newOption.stfReference = `@conversation/${this.templateName}:${optionTextId}`;
        }
        this.currentScreen.options.push(newOption);
    },

    removeOption(index) {
        this.currentScreen.options.splice(index, 1);
    },

    saveScreen() {
        const index = this.screens.findIndex(s => s.id === this.selectedScreen);
        if (index !== -1) {
            if (this.stfMode) {
                const leftDialogId = this.currentScreen.leftDialog.split(':')[1];
                this.stfData[leftDialogId] = this.currentScreen.custom_dialog_text;
                this.currentScreen.leftDialog = `${this.stfPathPrefix}${this.templateName}:${leftDialogId}`;
                this.currentScreen.options.forEach(option => {
                    const optionTextId = option.stfReference.split(':')[1];
                    this.stfData[optionTextId] = option.text;
                    option.stfReference = `${this.stfPathPrefix}${this.templateName}:${optionTextId}`;
                });
            }

            if (this.currentScreen.task_action === 'activateTask') {
                const activeTasks = this.screens.filter(s => s.task_action === 'activateTask');
                const taskIndex = activeTasks.findIndex(s => s.id === this.currentScreen.id);
                const paddedOrderNr = String(taskIndex !== -1 ? taskIndex : activeTasks.length).padStart(2, '0');
                this.currentScreen.task_reaction = `${this.templateName}_${paddedOrderNr}`;
            }

            this.screens[index] = JSON.parse(JSON.stringify(this.currentScreen));
        }
    },

    removeScreen(id) {
        if (this.screens.length > 1) {
            this.screens = this.screens.filter(screen => screen.id !== id);
            
            this.screens.forEach(screen => {
                screen.options = screen.options.map(option => 
                    option.next_screen === id ? { ...option, next_screen: null } : option
                );
            });

            if (this.selectedScreen === id) {
                this.selectedScreen = null;
                this.currentScreen = { options: [] };
            }

            if (this.screens[0].id === id) {
                this.screens[0].id_name = 'first_screen';
            }
        }
    },

    generateUniqueId() {
        return Math.random().toString(36).substr(2, 8);
    },
};

const STFManager = {
    toggleSTFMode() {
        this.stfMode = !this.stfMode;
        if (this.stfMode) {
            this.convertToSTFMode();
        } else {
            this.convertFromSTFMode();
        }
    },

    convertToSTFMode() {
        this.screens = this.screens.map(screen => {
            const leftDialogId = screen.leftDialog ? screen.leftDialog.split(':')[1] : `s_${this.generateUniqueId()}`;
            this.stfData[leftDialogId] = screen.custom_dialog_text;
            return {
                ...screen,
                leftDialog: `${this.stfPathPrefix}${this.templateName}:${leftDialogId}`,
                options: screen.options.map(option => {
                    const optionTextId = option.stfReference ? option.stfReference.split(':')[1] : `s_${this.generateUniqueId()}`;
                    this.stfData[optionTextId] = option.text;
                    return {
                        ...option,
                        stfReference: `${this.stfPathPrefix}${this.templateName}:${optionTextId}`
                    };
                })
            };
        });
    },
    
    convertFromSTFMode() {
        this.screens = this.screens.map(screen => ({
            ...screen,
            custom_dialog_text: screen.leftDialog ? (this.stfData[screen.leftDialog.split(':')[1]] || screen.custom_dialog_text) : screen.custom_dialog_text,
            options: screen.options.map(option => ({
                ...option,
                text: option.stfReference ? (this.stfData[option.stfReference.split(':')[1]] || option.text) : option.text
            }))
        }));
        this.stfData = {};
    },

    generateSTFData() {
        let data = [];
        this.screens.forEach(screen => {
            const leftDialogId = screen.leftDialog.split(':')[1];
            data.push([leftDialogId, screen.custom_dialog_text]);
            screen.options.forEach(option => {
                const optionTextId = option.stfReference.split(':')[1];
                data.push([optionTextId, option.text]);
            });
        });
        return data;
    },

    async downloadSTF() {
        if (!this.stfMode) {
            alert('STF mode is not enabled.');
            return;
        }

        const stfData = this.generateSTFData();
        
        try {
            const response = await fetch('/api/templates/stf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    templateName: this.templateName,
                    data: stfData
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate STF file');
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${this.templateName || 'conversation'}.stf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading STF file:', error);
            alert(`Error downloading STF file: ${error.message}`);
        }
    },

    generateSTFTaskData() {
        let data = {};
        let indexNum = 0;
        this.screens.forEach(screen => {
            if (screen.task_action == 'activateTask') {
                const taskTitle = screen.task_title;
                const taskDescription = screen.task_description;
                data[indexNum] = {
                    title: taskTitle,
                    description: taskDescription
                };
                indexNum++;
            }
        });
        return data;
    },

    async downloadSTFTaskData() {
        const STFTaskData = this.generateSTFTaskData();

        try {
            const response = await fetch('/api/templates/stftask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    templateName: this.templateName,
                    data: STFTaskData
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate STF Task Data');
            }

            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${this.templateName || '_stf'}.stf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading STF file:', error);
            alert(error.message || 'Error downloading STF file');
        }
    }
};

const LuaGenerator = {
    async generateLua() {
        if (!this.templateId) {
            alert('Please load or save a template first');
            return;
        }

        try {
            const response = await fetch(`/api/templates/${this.templateId}/lua`);
            if (!response.ok) {
                throw new Error('Failed to generate Lua script');
            }
            const result = await response.json();
            this.luaScript = result.lua_script;
        } catch (error) {
            console.error('Error generating Lua script:', error);
            alert(`Error generating Lua script: ${error.message}`);
        }
    },

    downloadLua() {
        if (!this.luaScript) {
            alert('Please generate the Lua script first.');
            return;
        }

        const element = document.createElement('a');
        const file = new Blob([this.luaScript], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${this.templateName+'_convo' || 'script'}.lua`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    },

    async generateConvoHandler() {
        if (!this.templateId) {
            alert('Please load or save a template first');
            return;
        }

        try {
            const response = await fetch(`/api/templates/${this.templateId}/convo_handler`);
            if (!response.ok) {
                throw new Error('Failed to generate Lua script');
            }
            const result = await response.json();
            this.convoHandler = result.convo_handler;
        } catch (error) {
            console.error('Error generating Lua script:', error);
            alert(`Error generating Lua script: ${error.message}`);
        }
    },

    downloadConvoHandler() {
        if (!this.luaScript) {
            alert('Please generate the Lua script first.');
            return;
        }

        const element = document.createElement('a');
        const file = new Blob([this.convoHandler], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${this.templateName+'_convo_handler' || 'script'}.lua`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    },
};
