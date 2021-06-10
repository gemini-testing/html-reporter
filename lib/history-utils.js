'use strict';

const {last, isUndefined} = require('lodash');

const formatDuration = (d) => `<- ${d}ms`;

const wrapArg = (arg) => `"${arg}"`;

const getCommand = ({
    n: name,
    a: args = [],
    d: duration}
) => `${name}(${args.map(wrapArg).join(', ')}) ${formatDuration(duration)}`;

const getCommandsHistory = (history) => {
    if (isUndefined(history)) {
        return;
    }

    try {
        const formatedCommands = history
            .map(getCommand)
            .map((s) => `\t${s}\n`);
        const lastCommandChildren = last(history).c;
        const formatedChildren = lastCommandChildren
            .map((cmd) => `${getCommand(cmd)}`)
            .map((s) => `\t\t${s}\n`);

        return [...formatedCommands, ...formatedChildren];
    } catch (e) {
        return `failed to get command history: ${e.message}`;
    }
};

module.exports = {
    getCommandsHistory
};
