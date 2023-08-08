import chalk from 'chalk';
import opener from 'opener';
import server from './server';
import {logger} from '../common-utils';
import utils from '../server-utils';

const {logError} = utils;

interface ServerArgs {
    paths: string[];
    hermione: unknown;
    guiApi: unknown;
    configs: {
        options: {
            open: unknown,
        }
    };
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
