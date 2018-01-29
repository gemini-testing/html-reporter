'use strict';

const toolAdapters = {
    'gemini': require('./gemini')
};

module.exports = {
    create: (toolName, paths, tool, configs) => {
        return toolAdapters[toolName].create(paths, tool, configs);
    }
};
