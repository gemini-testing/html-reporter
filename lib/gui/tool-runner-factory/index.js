'use strict';

const toolAdapters = {
    gemini: require('./gemini'),
    hermione: require('./hermione')
};

module.exports = {
    create: (toolName, paths, tool, configs) => {
        return toolAdapters[toolName].create(paths, tool, configs);
    }
};
