import _ from 'lodash';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import Database from 'better-sqlite3';
import type {CoordBounds} from 'looks-same';

import {logger} from '../../common-utils';
import {DATABASE_URLS_JSON_NAME, DB_CURRENT_VERSION, LOCAL_DATABASE_NAME} from '../../constants';
import {mergeTables} from '../../db-utils/server';
import {TestEqualDiffsData, TestRefUpdateData} from '../../tests-tree-builder/gui';
import {ImageInfoDiff, ImageSize} from '../../types';
import {backupAndReset, getDatabaseVersion, migrateDatabase} from '../../db-utils/migrations';

import makeDebug from 'debug';

const debug = makeDebug('html-reporter:gui:tool-runner:utils');

export const formatId = (hash: string, browserId: string): string => `${hash}/${browserId}`;

export const mkFullTitle = ({suite, state}: Pick<TestRefUpdateData, 'suite' | 'state'>): string => {
    return suite.path.length > 0 ? `${suite.path.join(' ')} ${state.name}` : state.name;
};

export const mergeDatabasesForReuse = async (reportPath: string): Promise<void> => {
    const dbUrlsJsonPath = path.resolve(reportPath, DATABASE_URLS_JSON_NAME);
    const mergedDbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);

    if (!await fs.pathExists(dbUrlsJsonPath)) {
        return;
    }

    const {dbUrls = []}: {dbUrls: string[]} = await fs.readJson(dbUrlsJsonPath);

    const dbPaths = dbUrls
        .filter(u => u !== LOCAL_DATABASE_NAME)
        .map(u => path.resolve(reportPath, u));

    if (!dbPaths.length) {
        return;
    }

    logger.warn(chalk.yellow(`Merge databases to ${LOCAL_DATABASE_NAME}`));

    const mergedDatabase = new Database(mergedDbPath);
    mergeTables({
        db: mergedDatabase,
        dbPaths,
        getExistingTables: (statement: Database.Statement) => {
            return statement.all().map((table) => (table as {name: string}).name);
        }
    });
    mergedDatabase.close();

    await Promise.all(dbPaths.map(p => fs.remove(p)));
};

export const prepareLocalDatabase = async (reportPath: string): Promise<void> => {
    debug('prepareLocalDatabase', reportPath);
    const dbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);

    if (!fs.existsSync(dbPath)) {
        return;
    }

    const db = new Database(dbPath);
    try {
        const version = getDatabaseVersion(db);
        debug('determined db version', version);

        if (version !== null && version < DB_CURRENT_VERSION) {
            await migrateDatabase(db, version);
        } else if (version === null) {
            const backupPath = await backupAndReset(reportPath);
            console.warn(`SQLite db at ${dbPath} is of unknown unsupported version.\nBacked up to ${backupPath} and starting from scratch.`);
        } else if (version > DB_CURRENT_VERSION) {
            const backupPath = await backupAndReset(reportPath);
            console.warn(`SQLite db at ${dbPath} is of unsupported version. ` +
                'This probably happened because the report was generated with a newer version of html-reporter than you are trying to use now. ' +
                'Please update html-reporter to the latest version to open this report.\n' +
                `Backed up to ${backupPath} and starting from scratch.`);
        }
    } finally {
        db.close();
    }
};

export const filterByEqualDiffSizes = (imagesInfo: TestEqualDiffsData[], refDiffClusters?: CoordBounds[]): TestEqualDiffsData[] => {
    if (!refDiffClusters || _.isEmpty(refDiffClusters)) {
        return [];
    }

    const refDiffSizes = refDiffClusters.map(getDiffClusterSizes);

    return _.filter(imagesInfo, (imageInfo) => {
        const imageInfoFail = imageInfo as ImageInfoDiff;

        const imageDiffSizes = imageInfoFail.diffClusters?.map(getDiffClusterSizes) ?? [];
        const equal = compareDiffSizes(imageDiffSizes, refDiffSizes);

        if (!equal) {
            return false;
        }

        if (!_.isEqual(imageDiffSizes, refDiffSizes)) {
            imageInfoFail.diffClusters = reorderClustersByEqualSize(imageInfoFail.diffClusters ?? [], imageDiffSizes, refDiffSizes);
        }

        return true;
    });
};

function getDiffClusterSizes(diffCluster: CoordBounds): ImageSize {
    return {
        width: diffCluster.right - diffCluster.left + 1,
        height: diffCluster.bottom - diffCluster.top + 1
    };
}

function compareDiffSizes(diffSizes1: ImageSize[], diffSizes2: ImageSize[]): boolean {
    if (diffSizes1.length !== diffSizes2.length) {
        return false;
    }

    return diffSizes1.every((diffSize) => {
        const foundIndex = _.findIndex(diffSizes2, diffSize);

        if (foundIndex < 0) {
            return false;
        }

        diffSizes2 = diffSizes2.filter((_v, ind) => ind !== foundIndex);

        return true;
    });
}

function reorderClustersByEqualSize(diffClusters1: CoordBounds[], diffSizes1: ImageSize[], diffSizes2: ImageSize[]): CoordBounds[] {
    return diffClusters1.reduce((acc, cluster, i) => {
        if (diffSizes1[i] !== diffSizes2[i]) {
            const foundIndex = _.findIndex(diffSizes2, diffSizes1[i]);
            diffSizes2 = diffSizes2.filter((_v, ind) => ind !== foundIndex);
            acc[foundIndex] = cluster;
        } else {
            acc[i] = cluster;
        }

        return acc;
    }, [] as CoordBounds[]);
}
