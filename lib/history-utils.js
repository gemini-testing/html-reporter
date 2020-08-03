'use strict';

const path = require('path');
const {takeRightWhile, isUndefined} = require('lodash');

const wrapArg = (arg) => `"${arg}"`;

const getCommandWithArgs = ({name, args = []}) => `${name}(${args.map(wrapArg).join(', ')})`;
const getCommandWithoutArgs = ({name}) => `${name}(...)`;

const getFileFromStack = ({stack}) => {
    if (!stack || typeof stack !== 'string') {
        return '';
    }

    const openingParenthesisPos = stack.lastIndexOf('(');
    if (openingParenthesisPos !== -1) {
        const closingParenthesisPos = stack.lastIndexOf(')');

        const filePath = stack.substring(openingParenthesisPos + 1, closingParenthesisPos);

        return path.relative(process.cwd(), filePath);
    }

    return stack;
};

const getCommandHistory = (allHistory, runnableFile, commandsWithShortHistory = []) => {
    if (isUndefined(allHistory)) {
        return;
    }

    const getCommand = (cmd) => {
        return commandsWithShortHistory.includes(cmd.name)
            ? getCommandWithoutArgs(cmd)
            : getCommandWithArgs(cmd);
    };

    try {
        const commands = allHistory
            .filter(({stack}) => stack.includes(runnableFile))
            .map(getCommand)
            .map((s) => `\t${s}\n`);

        const lastSubHistory = takeRightWhile(allHistory, ({stack}) => !stack.includes(runnableFile));

        const lastSubCommands = lastSubHistory
            .map((cmd) => `${getCommand(cmd)}: ${getFileFromStack(cmd)}`)
            .map((s) => `\t\t${s}\n`);

        return [...commands, ...lastSubCommands];
    } catch (e) {
        return `failed to get command history: ${e.message}`;
    }
};

module.exports = {
    getCommandHistory
};
