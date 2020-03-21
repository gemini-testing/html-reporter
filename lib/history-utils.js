'use strict';

const {takeRightWhile, isUndefined} = require('lodash');

const normalizeArg = (arg) => typeof arg === 'object' ? JSON.stringify(arg) : `"${arg}"`;

const getCommandWithArgs = ({name, args = []}) => `${name}(${args.map(normalizeArg).join(', ')})`;

const getFileFromStack = ({stack}) => {
    if (!stack || typeof stack !== 'string') {
        return '';
    }

    const openingParenthesisPos = stack.lastIndexOf('(');
    if (openingParenthesisPos !== -1) {
        const closingParenthesisPos = stack.lastIndexOf(')');

        return stack.substring(openingParenthesisPos + 1, closingParenthesisPos);
    }

    return stack;
};

const getCommandWithArgsAndFile = (record) => `${getCommandWithArgs(record)}: ${getFileFromStack(record)}`;

const getCommandHistory = (allHistory, runnableFile) => {
    if (isUndefined(allHistory)) {
        return;
    }

    try {
        const commands = allHistory
            .filter(({stack}) => stack.includes(runnableFile))
            .map(getCommandWithArgs)
            .map((s) => `\t${s}\n`);

        const lastSubHistory = takeRightWhile(allHistory, ({stack}) => !stack.includes(runnableFile));

        const lastSubCommands = lastSubHistory
            .map(getCommandWithArgsAndFile)
            .map((s) => `\t\t${s}\n`);

        return [...commands, ...lastSubCommands];
    } catch (e) {
        return `failed to get command history: ${e.message}`;
    }
};

module.exports = {
    getCommandHistory
};
