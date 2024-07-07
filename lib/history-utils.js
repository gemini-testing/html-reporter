'use strict';

import { isEmpty } from 'lodash';

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

export const getCommandsHistory = (history) => {
    if (isEmpty(history)) {
        return [];
    }

    try {
        const formattedHistory = [];

        const traverseCb = (node, depth) => {
            const offset = '\t'.repeat(depth);
            const isGroup = Boolean(node.g);
            const duration = node.d;
            const isFailed = Boolean(node.f);
            const title = isGroup ? node.n : getCommand(node);
            const formattedDuration = formatDuration(duration);

            formattedHistory.push(`${offset}${title} ${formattedDuration}\n`);

            return isFailed;
        };

        traverseNodes(history, traverseCb);

        return formattedHistory;
    } catch (e) {
        return [`failed to get command history: ${e.message}`];
    }
};

export default {
    getCommandsHistory
};
