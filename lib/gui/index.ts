import type {CommanderStatic} from '@gemini-testing/commander';
import chalk from 'chalk';
import opener from 'opener';

import server from './server';
import {logger} from '../common-utils';
import * as utils from '../server-utils';
import {ReporterConfig} from '../types';

const {logError} = utils;

export interface GuiCliOptions {
    autoRun: boolean;
    open: unknown;
}

export interface GuiConfigs {
    options: GuiCliOptions;
    program: CommanderStatic;
    pluginConfig: ReporterConfig;
}

interface ServerArgs {
    paths: string[];
    hermione: unknown;
    guiApi: unknown;
    configs: GuiConfigs;
}

export default (args: ServerArgs): void => {
    server.start(args)
        .then(({url}: { url: string }) => {
            logger.log(`GUI is running at ${chalk.cyan(url)}`);
            args.configs.options.open && opener(url);
        })
        .catch((err: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            logError(err);
            process.exit(1);
        });
};
