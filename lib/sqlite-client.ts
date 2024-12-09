import path from 'path';
import Database from 'better-sqlite3';
import makeDebug from 'debug';
import fs from 'fs-extra';
import NestedError from 'nested-error-stacks';

import {getShortMD5} from './common-utils';
import {TestStatus, DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS, LOCAL_DATABASE_NAME, DATABASE_URLS_JSON_NAME} from './constants';
import {createTablesQuery} from './db-utils/common';
import type {ImageInfoFull, TestError, TestStepCompressed} from './types';
import {HtmlReporter} from './plugin-api';
import {ReporterTestResult} from './adapters/test-result';
import {DbTestResultTransformer} from './adapters/test-result/transformers/db';

const debug = makeDebug('html-reporter:sqlite-client');

interface QueryParams {
    select?: string;
    where?: string;
    orderBy?: string;
    orderDescending?: boolean;
    limit?: number;
    noCache?: boolean;
}

interface DeleteParams {
    where?: string;
    orderBy?: string;
    orderDescending?: boolean;
    limit?: number;
}

export interface DbTestResult {
    description?: string | null;
    error?: TestError;
    history: TestStepCompressed[];
    imagesInfo: ImageInfoFull[];
    metaInfo: Record<string, unknown>;
    multipleTabs: boolean;
    /* Browser name. Example: `"chrome"` */
    name: string;
    screenshot: boolean;
    skipReason?: string;
    status: TestStatus;
    /* Last part of `suitePath`. Example: `"Test 1"` */
    suiteName: string;
    /* Segments of full test name. Example: `["Title", "Test 1"]` */
    suitePath: string[];
    suiteUrl: string;
    /* Unix time in ms. Example: `1700563430266` */
    timestamp: number;
    /* Duration in ms. Example: `1601` */
    duration: number;
}

interface SqliteClientOptions {
    // TODO: get rid of htmlReporter in the future
    htmlReporter: HtmlReporter;
    reportPath: string;
    reuse?: boolean;
}

export class SqliteClient {
    private readonly _db: Database.Database;
    private _queryCache: Map<string, unknown>;
    private _transformer: DbTestResultTransformer;

    static async create<T extends SqliteClient>(
        this: { new(db: Database.Database, transformer: DbTestResultTransformer): T },
        options: SqliteClientOptions
    ): Promise<T> {
        const {htmlReporter, reportPath} = options;
        const dbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);
        const dbUrlsJsonPath = path.resolve(reportPath, DATABASE_URLS_JSON_NAME);

        let db: Database.Database;

        try {
            if (!options.reuse) {
                await Promise.all([
                    fs.remove(dbPath),
                    fs.remove(dbUrlsJsonPath)
                ]);
            }

            await fs.ensureDir(reportPath);

            db = new Database(dbPath);
            debug('db connection opened');

            createTablesQuery().forEach((query) => db?.prepare(query).run());
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            throw new NestedError(`Error creating database at "${dbPath}"`, err);
        }

        const transformer = new DbTestResultTransformer({baseHost: htmlReporter.config.baseHost});

        return new this(db, transformer);
    }

    constructor(db: Database.Database, transformer: DbTestResultTransformer) {
        this._db = db;
        this._queryCache = new Map();
        this._transformer = transformer;
    }

    getRawConnection(): Database.Database {
        return this._db;
    }

    close(): void {
        this._db.prepare('VACUUM').run();

        debug('db connection closed');
        this._db.close();
    }

    query<T = unknown>(queryParams: QueryParams = {}, ...queryArgs: string[]): T {
        const {select, where, orderBy, orderDescending, limit, noCache = false} = queryParams;
        const cacheKey = (!noCache && getShortMD5(`${select}#${where}#${orderBy}${orderDescending}${queryArgs.join('#')}`)) as string;

        if (!noCache && this._queryCache.has(cacheKey)) {
            return this._queryCache.get(cacheKey) as T;
        }

        const sentence = `SELECT ${select || '*'} FROM ${DB_SUITES_TABLE_NAME}`
            + this._createSentence({where, orderBy, orderDescending, limit});

        const result = this._db.prepare(sentence).get(...queryArgs);

        if (!noCache) {
            this._queryCache.set(cacheKey, result);
        }

        return result as T;
    }

    write(testResult: ReporterTestResult): void {
        const dbTestResult = this._transformer.transform(testResult);
        const values = this._createValuesArray(dbTestResult);

        const placeholders = values.map(() => '?').join(', ');
        this._db.prepare(`INSERT INTO ${DB_SUITES_TABLE_NAME} VALUES (${placeholders})`).run(...values);
    }

    delete(deleteParams: DeleteParams = {}, ...deleteArgs: string[]): void {
        const sentence = `DELETE FROM ${DB_SUITES_TABLE_NAME}`
            + this._createSentence(deleteParams);

        this._db.prepare(sentence).run(...deleteArgs);
    }

    private _createSentence(params: { where?: string; orderBy?: string; orderDescending?: boolean; limit?: number }): string {
        let sentence = '';

        if (params.where) {
            sentence += ` WHERE ${params.where}`;
        }

        if (params.orderBy) {
            sentence += ` ORDER BY ${params.orderBy} ${params.orderDescending ? 'DESC' : 'ASC'}`;
        }

        if (params.limit) {
            sentence += ` LIMIT ${params.limit}`;
        }

        return sentence;
    }

    private _createValuesArray(testResult: DbTestResult): (string | number | null)[] {
        return SUITES_TABLE_COLUMNS.reduce<(string | number | null)[]>((acc, {name}) => {
            const value = testResult[name as keyof DbTestResult];
            if (value === undefined || value === null) {
                acc.push(null);
                return acc;
            }
            switch (value.constructor) {
                case Array:
                case Object:
                    acc.push(JSON.stringify(value));
                    break;
                case Boolean:
                    acc.push(value ? 1 : 0);
                    break;
                default:
                    acc.push(value as string | number);
            }
            return acc;
        }, []);
    }
}
