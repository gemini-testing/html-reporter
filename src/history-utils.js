'use strict';

const {isEmpty} = require('lodash');

const formatDuration = (d) => `<- ${d}ms`;

const wrapArg = (arg) => `"${arg}"`;

const getCommand = ({
    n: name,
    a: args = []
}) => `${name}(${args.map(wrapArg).join(', ')})`;

const traverseNodes = (nodes, traverseCb, depth = 0) => {
    nodes.forEach(node => {
        const shouldTraverseChildren = traverseCb(node, depth);

        if (shouldTraverseChildren) {
            traverseNodes(node.c, traverseCb, depth + 1);
        }
    });
};

const getCommandsHistory = (history) => {
    if (isEmpty(history)) {
        return;
    }

    try {
        const formatedHistory = [];

        const traverseCb = (node, depth) => {
            const offset = '\t'.repeat(depth);
            const isGroup = Boolean(node.g);
            const duration = node.d;
            const isFailed = Boolean(node.f);
            const title = isGroup ? node.n : getCommand(node);
            const formatedDuration = formatDuration(duration);

            formatedHistory.push(`${offset}${title} ${formatedDuration}\n`);

            return isFailed;
        };

        traverseNodes(history, traverseCb);

        return formatedHistory;
    } catch (e) {
        return `failed to get command history: ${e.message}`;
    }
};

module.exports = {
    getCommandsHistory
};
