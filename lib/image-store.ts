import {DB_COLUMNS} from './constants';
import {SqliteClient} from './sqlite-client';
import {ImageInfo, ImageInfoFull, LabeledSuitesRow, TestSpecByPath} from './types';

export interface ImageStore {
    getLastImageInfoFromDb(testResult: TestSpecByPath, stateName?: string): ImageInfo | undefined ;
}

export class SqliteImageStore implements ImageStore {
    private _dbClient: SqliteClient;

    constructor(dbClient: SqliteClient) {
        this._dbClient = dbClient;
    }

    getLastImageInfoFromDb(testResult: TestSpecByPath, stateName?: string): ImageInfo | undefined {
        const browserName = testResult.browserId;
        const suitePath = testResult.testPath;
        const suitePathString = JSON.stringify(suitePath);

        const imagesInfoResult = this._dbClient.query<Pick<LabeledSuitesRow, 'imagesInfo'> | undefined>({
            select: DB_COLUMNS.IMAGES_INFO,
            where: `${DB_COLUMNS.SUITE_PATH} = ? AND ${DB_COLUMNS.NAME} = ?`,
            orderBy: DB_COLUMNS.TIMESTAMP,
            orderDescending: true,
            noCache: true
        }, suitePathString, browserName)?.imagesInfo;

        const imagesInfo: ImageInfoFull[] = imagesInfoResult && JSON.parse(imagesInfoResult) || [];
        return imagesInfo.find(info => (info as {stateName?: string}).stateName === stateName);
    }
}
