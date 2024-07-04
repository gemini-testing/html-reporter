import type {CommanderStatic} from '@gemini-testing/commander';
import chalk from 'chalk';
import opener from 'opener';

import * as server from './server';
import {logger} from '../common-utils';
import * as utils from '../server-utils';

import type {TestplaneToolAdapter} from '../adapters/tool/testplane';

const {logError} = utils;

export interface GuiCliOptions {
    autoRun: boolean;
    open: unknown;
    port: number;
    hostname: string;
}

export interface ServerArgs {
    paths: string[];
    toolAdapter: TestplaneToolAdapter;
    cli: {
        options: GuiCliOptions;
        tool: CommanderStatic;
    }
}

export default (args: ServerArgs): void => {
    server.start(args)
        .then(({url}: { url: string }) => {
            logger.log(`GUI is running at ${chalk.cyan(url)}`);
            args.cli.options.open && opener(url);
        })
        .catch((err: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            logError(err);
            process.exit(1);
        });
};
