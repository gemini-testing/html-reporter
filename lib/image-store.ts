import {DB_COLUMNS} from './constants';
import {getSuitePath} from './plugin-utils';
import {SqliteAdapter} from './sqlite-adapter';
import {ImageInfo, ImageInfoFull, LabeledSuitesRow, TestResult} from './types';

export interface ImageStore {
    getLastImageInfoFromDb(testResult: TestResult, stateName?: string): ImageInfo | undefined ;
}

export class SqliteImageStore implements ImageStore {
    private _sqliteAdapter: SqliteAdapter;

    constructor(sqliteAdapter: SqliteAdapter) {
        this._sqliteAdapter = sqliteAdapter;
    }

    getLastImageInfoFromDb(testResult: TestResult, stateName?: string): ImageInfo | undefined {
        const browserName = testResult.browserId;
        const suitePath = getSuitePath(testResult);
        const suitePathString = JSON.stringify(suitePath);

        const imagesInfoResult = this._sqliteAdapter.query<Pick<LabeledSuitesRow, 'imagesInfo'> | undefined>({
            select: DB_COLUMNS.IMAGES_INFO,
            where: `${DB_COLUMNS.SUITE_PATH} = ? AND ${DB_COLUMNS.NAME} = ?`,
            orderBy: DB_COLUMNS.TIMESTAMP,
            orderDescending: true
        }, suitePathString, browserName);

        const imagesInfo: ImageInfoFull[] = imagesInfoResult && JSON.parse(imagesInfoResult[DB_COLUMNS.IMAGES_INFO as keyof Pick<LabeledSuitesRow, 'imagesInfo'>]) || [];
        return imagesInfo.find(info => info.stateName === stateName);
    }
}
