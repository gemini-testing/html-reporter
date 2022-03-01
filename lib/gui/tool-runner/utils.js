'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const {logger} = require('../../common-utils');
const {DATABASE_URLS_JSON_NAME, LOCAL_DATABASE_NAME} = require('../../constants/database');
const {mergeTables} = require('../../db-utils/server');

exports.formatId = (hash, browserId) => `${hash}/${browserId}`;

exports.getShortMD5 = (str) => {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
};

exports.mkFullTitle = ({suite, state}) => {
    return suite.path.length > 0
        ? `${suite.path.join(' ')} ${state.name}`
        : state.name;
};

// 'databaseUrls.json' may contain many databases urls but html-reporter at gui mode can work with single databases file.
// all databases should be local files.
exports.mergeDatabasesForReuse = async (reportPath) => {
    const dbUrlsJsonPath = path.resolve(reportPath, DATABASE_URLS_JSON_NAME);
    const mergedDbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);

    if (!await fs.pathExists(dbUrlsJsonPath)) {
        return;
    }

    const {dbUrls = []} = await fs.readJson(dbUrlsJsonPath);

    const dbPaths = dbUrls
        .filter(u => u !== LOCAL_DATABASE_NAME)
        .map(u => path.resolve(reportPath, u));

    if (!dbPaths.length) {
        return;
    }

    logger.warn(chalk.yellow(`Merge databases to ${LOCAL_DATABASE_NAME}`));

    const mergedDatabase = new Database(mergedDbPath);
    mergeTables({db: mergedDatabase, dbPaths, getExistingTables: (statement) => {
        return statement.all().map((table) => table.name);
    }});
    mergedDatabase.close();

    await Promise.all(dbPaths.map(p => fs.remove(p)));
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
