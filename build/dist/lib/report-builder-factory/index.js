"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ReportBuilder = require('./report-builder');
var adapters = {
    gemini: require('../test-adapter/gemini-test-adapter'),
    hermione: require('../test-adapter/hermione-test-adapter')
};
module.exports = {
    create: function (toolName, tool, pluginConfig) {
        return ReportBuilder.create(tool, pluginConfig, adapters[toolName]);
    }
};
//# sourceMappingURL=index.js.map