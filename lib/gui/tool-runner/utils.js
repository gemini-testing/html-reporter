'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const NestedError = require('nested-error-stacks');

const StaticTestsTreeBuilder = require('../../tests-tree-builder/static');
const {logger, logError} = require('../../server-utils');
const constantFileNames = require('../../constants/file-names');
const {mergeTablesQueries, selectAllSuitesQuery, compareDatabaseRowsByTimestamp} = require('../../common-utils');
const {writeDatabaseUrlsFile} = require('../../server-utils');

exports.formatId = (hash, browserId) => `${hash}/${browserId}`;

exports.getShortMD5 = (str) => {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
};

exports.mkFullTitle = ({suite, state}) => {
    // https://github.com/mochajs/mocha/blob/v2.4.5/lib/runnable.js#L165
    return `${suite.path.join(' ')} ${state.name}`;
};

// 'databaseUrls.json' may contain many databases urls but html-reporter at gui mode can work with single databases file.
// all databases should be local files.
exports.mergeDatabasesForReuse = async (reportPath) => {
    const dbUrlsJsonPath = path.resolve(reportPath, constantFileNames.DATABASE_URLS_JSON_NAME);
    const mergedDbPath = path.resolve(reportPath, constantFileNames.LOCAL_DATABASE_NAME);

    if (!await fs.pathExists(dbUrlsJsonPath)) {
        return;
    }

    const {dbUrls = []} = await fs.readJson(dbUrlsJsonPath);

    const dbPaths = dbUrls
        .filter(u => u !== constantFileNames.LOCAL_DATABASE_NAME)
        .map(u => path.resolve(reportPath, u));

    if (!dbPaths.length) {
        return;
    }

    logger.warn(chalk.yellow(`Merge databases to ${constantFileNames.LOCAL_DATABASE_NAME}`));

    const mergedDatabase = new Database(mergedDbPath);

    for (const query of mergeTablesQueries(dbPaths)) {
        try {
            mergedDatabase.prepare(query).run();
        } catch (err) {
            // TODO: To be able to work with files that have been created before
            // TODO: Remove in next versions
            if (/no such table/.test(err)) {
                console.warn(err);

                continue;
            }

            throw err;
        }
    }

    mergedDatabase.close();

    await writeDatabaseUrlsFile(reportPath, [constantFileNames.LOCAL_DATABASE_NAME]);
    await Promise.all(dbPaths.map(p => fs.remove(p)));
};

exports.getDataFromDatabase = (dbPath) => {
    try {
        const db = new Database(dbPath, {readonly: true, fileMustExist: true});
        const testsTreeBuilder = StaticTestsTreeBuilder.create();

        const suitesRows = db.prepare(selectAllSuitesQuery()).raw().all().sort(compareDatabaseRowsByTimestamp);
        const {tree} = testsTreeBuilder.build(suitesRows);

        db.close();

        return tree;
    } catch (err) {
        throw new NestedError('Error while getting data from database ', err);
    }
};

exports.withErrorHandling = async (fn) => {
    try {
        await fn();
    } catch (err) {
        logError(err);
        process.exit(1);
    }
};

exports.filterByEqualDiffSizes = (imagesInfo, refDiffClusters) => {
    if (_.isEmpty(refDiffClusters)) {
        return [];
    }

    const refDiffSizes = refDiffClusters.map(getDiffClusterSizes);

    return _.filter(imagesInfo, (imageInfo) => {
        const imageDiffSizes = imageInfo.diffClusters.map(getDiffClusterSizes);
        const equal = compareDiffSizes(imageDiffSizes, refDiffSizes);

        if (!equal) {
            return false;
        }

        if (!_.isEqual(imageDiffSizes, refDiffSizes)) {
            imageInfo.diffClusters = reorderClustersByEqualSize(imageInfo.diffClusters, imageDiffSizes, refDiffSizes);
        }

        return true;
    });
};

function getDiffClusterSizes(diffCluster) {
    return {
        width: diffCluster.right - diffCluster.left + 1,
        height: diffCluster.bottom - diffCluster.top + 1
    };
}

function compareDiffSizes(diffSizes1, diffSizes2) {
    if (diffSizes1.length !== diffSizes2.length) {
        return false;
    }

    return diffSizes1.every((diffSize) => {
        const foundIndex = _.findIndex(diffSizes2, diffSize);

        if (foundIndex < 0) {
            return false;
        }

        diffSizes2 = diffSizes2.filter((v, ind) => ind !== foundIndex);

        return true;
    });
}

function reorderClustersByEqualSize(diffClusters1, diffSizes1, diffSizes2) {
    return diffClusters1.reduce((acc, cluster, i) => {
        if (diffSizes1[i] !== diffSizes2[i]) {
            const foundIndex = _.findIndex(diffSizes2, diffSizes1[i]);
            diffSizes2 = diffSizes2.filter((v, ind) => ind !== foundIndex);
            acc[foundIndex] = cluster;
        } else {
            acc[i] = cluster;
        }

        return acc;
    }, []);
}
