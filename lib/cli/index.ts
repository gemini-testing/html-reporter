import path from 'node:path';
import _ from 'lodash';
import {Command} from '@gemini-testing/commander';
import pkg from '../../package.json';

import {ToolName} from '../constants';
import {makeToolAdapter} from '../adapters/tool';

export const commands = {
    GUI: 'gui',
    MERGE_REPORTS: 'merge-reports',
    REMOVE_UNUSED_SCREENS: 'remove-unused-screens'
} as const;

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

    const toolAdapter = await makeToolAdapter({toolName: toolName as ToolName, configPath});

    for (const commandName of _.values(commands)) {
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
