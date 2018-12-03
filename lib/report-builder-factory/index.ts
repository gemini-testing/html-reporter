import { ITestTool } from 'typings/test-adapter';
import { IPluginConfig } from 'typings/pluginConfig';

const ReportBuilder = require('./report-builder');
const adapters = {
    gemini: require('../test-adapter/gemini-test-adapter'),
    hermione: require('../test-adapter/hermione-test-adapter')
};

module.exports = {
    create: (toolName: string, tool: ITestTool, pluginConfig: IPluginConfig) => {
        return ReportBuilder.create(tool, pluginConfig, adapters[toolName]);
    }
};
