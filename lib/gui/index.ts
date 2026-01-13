import type {CommanderStatic} from '@gemini-testing/commander';

import * as server from './server';
import * as utils from '../server-utils';
import {openBrowser} from './open-browser';

import type {ToolAdapter} from '../adapters/tool';

const {logError} = utils;

export interface GuiCliOptions {
    autoRun: boolean;
    open: unknown;
    port: number;
    hostname: string;
}

export interface ServerArgs {
    paths: string[];
    toolAdapter: ToolAdapter;
    cli: {
        options: GuiCliOptions;
        tool: CommanderStatic;
    }
}

export default (args: ServerArgs): void => {
    server.start(args)
        .then(async ({url}: { url: string }) => {
            if (args.cli.options.open) {
                await openBrowser(url);
            }
        })
        .catch((err: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            logError(err);
            process.exit(1);
        });
};
