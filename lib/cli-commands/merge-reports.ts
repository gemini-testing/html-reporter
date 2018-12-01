'use strict';
const mergeReports = require('../merge-reports');
const {logError} = require('../server-utils');
const {MERGE_REPORTS: commandName} = require('./');

interface IPath {
    path: string;
}

module.exports = (program: IProgram, {path}: IPath) => {
    program
        .command(`${commandName} [paths...]`)
        .allowUnknownOption()
        .description('merge reports')
        .option('-d, --destination <destination>', 'path to directory with merged report', path)
        .action(async (paths: string, options: { [key: string]: any }) => {
            try {
                await mergeReports(paths, options);
            } catch (err) {
                logError(err);
                process.exit(1);
            }
        });
};
