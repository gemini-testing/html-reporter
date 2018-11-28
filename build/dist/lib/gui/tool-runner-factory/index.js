'use strict';
var toolAdapters = {
    gemini: require('./gemini'),
    hermione: require('./hermione')
};
module.exports = {
    create: function (toolName, paths, tool, configs) {
        return toolAdapters[toolName].create(paths, tool, configs);
    }
};
//# sourceMappingURL=index.js.map