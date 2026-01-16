import path from 'node:path';
import _ from 'lodash';
import {Command} from '@gemini-testing/commander';
import pkg from '../../package.json';

import {cliCommands} from './commands';
import {ToolName} from '../constants';
import {makeToolAdapter, type ToolAdapter} from '../adapters/tool';
import {logger} from '../common-utils';

let toolAdapter: ToolAdapter;

process.on('uncaughtException', err => {
    logger.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, p) => {
    // Avoid double processing of unhandled rejections, this global flag is set by Testplane
    if ((global as Record<string, unknown>)['__TESTPLANE_INTERNAL_UNHANDLED_REJECTION_PROCESSED']) {
        return;
    }
    const errorMessage = [
        `Unhandled Rejection in ${toolAdapter ? toolAdapter.toolName + ':' : ''}${process.pid}:`,
        `Promise: ${JSON.stringify(p)}`,
        `Reason: ${_.get(reason, 'stack', reason)}`
    ].join('\n');

    if (toolAdapter) {
        toolAdapter.halt(new Error(errorMessage), 60000);
    } else {
        logger.error(errorMessage);
        process.exit(1);
    }
});

export const run = async (): Promise<void> => {
    const program = new Command(pkg.name)
        .version(pkg.version)
        .allowUnknownOption()
        .option('-c, --config <path>', 'path to configuration file')
        .option('-t, --tool <toolName>', 'tool name which should be run', ToolName.Testplane);

    const {tool: toolName, config: configPath} = preparseOptions(program, ['config', 'tool']);
    const availableToolNames = Object.values(ToolName);

    if (!availableToolNames.includes(toolName as ToolName)) {
        throw new Error(`Tool with name: "${toolName}" is not supported, try to use one of these: ${availableToolNames.map(t => `"${t}"`).join(', ')}`);
    }

    toolAdapter = await makeToolAdapter({toolName: toolName as ToolName, configPath});

    for (const commandName of _.values(cliCommands)) {
        const registerCmd = (await import(path.resolve(__dirname, './commands', commandName))).default;

        registerCmd(program, toolAdapter);
    }

    program.parse(process.argv);
};

function preparseOptions(program: Command, options: string[]): Record<string, string | undefined> {
    const configFileParser = Object.create(program) as Command;
    configFileParser.options = [].concat(program.options);
    configFileParser.option('-h, --help');

    configFileParser.parse(process.argv);

    return options.reduce((acc, val) => _.set(acc, val, configFileParser[val]), {});
}
