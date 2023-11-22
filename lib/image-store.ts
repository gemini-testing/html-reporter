import {DB_COLUMNS} from './constants';
import {SqliteClient} from './sqlite-client';
import {ImageInfo, ImageInfoFull, LabeledSuitesRow} from './types';
import {ReporterTestResultPlain} from './image-handler';

export interface ImageStore {
    getLastImageInfoFromDb(testResult: ReporterTestResultPlain, stateName?: string): ImageInfo | undefined ;
}

export class SqliteImageStore implements ImageStore {
    private _dbClient: SqliteClient;

    constructor(dbClient: SqliteClient) {
        this._dbClient = dbClient;
    }

    getLastImageInfoFromDb(testResult: ReporterTestResultPlain, stateName?: string): ImageInfo | undefined {
        const browserName = testResult.browserId;
        const suitePath = testResult.testPath;
        const suitePathString = JSON.stringify(suitePath);

        const imagesInfoResult = this._dbClient.query<Pick<LabeledSuitesRow, 'imagesInfo'> | undefined>({
            select: DB_COLUMNS.IMAGES_INFO,
            where: `${DB_COLUMNS.SUITE_PATH} = ? AND ${DB_COLUMNS.NAME} = ?`,
            orderBy: DB_COLUMNS.TIMESTAMP,
            orderDescending: true
        }, suitePathString, browserName);

        const imagesInfo: ImageInfoFull[] = imagesInfoResult && JSON.parse(imagesInfoResult[DB_COLUMNS.IMAGES_INFO as keyof Pick<LabeledSuitesRow, 'imagesInfo'>]) || [];
        return imagesInfo.find(info => (info as {stateName?: string}).stateName === stateName);
    }
}
