import path from 'path';
import Database from 'better-sqlite3';
import makeDebug from 'debug';
import type EventEmitter2 from 'eventemitter2';
import fs from 'fs-extra';
import type Hermione from 'hermione';
import NestedError from 'nested-error-stacks';

import {getShortMD5} from './common-utils';
import {TestStatus} from './constants';
import {DB_SUITES_TABLE_NAME, SUITES_TABLE_COLUMNS, LOCAL_DATABASE_NAME, DATABASE_URLS_JSON_NAME} from './constants/database';
import {createTablesQuery} from './db-utils/common';
import {DbNotInitializedError} from './errors/db-not-initialized-error';
import type {HtmlReporterApi, ImageInfoFull} from './types';

const debug = makeDebug('html-reporter:sqlite-adapter');

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

export interface PreparedTestResult {
    name: string;
    suiteUrl: string;
    metaInfo: Record<string, unknown>;
    history: string[];
    description: unknown;
    error: Error;
    skipReason?: string;
    imagesInfo: ImageInfoFull[];
    screenshot: boolean;
    multipleTabs: boolean;
    status: TestStatus;
    timestamp?: number;
}

interface ParseTestResultParams {
    suiteName: string;
    suitePath: string[];
    testResult: PreparedTestResult;
}

interface ParsedTestResult extends PreparedTestResult {
    suiteName: ParseTestResultParams['suiteName'];
    suitePath: ParseTestResultParams['suitePath'];
}

interface SqliteAdapterOptions {
    hermione: Hermione & HtmlReporterApi;
    reportPath: string;
    reuse?: boolean;
}

export class SqliteAdapter {
    private _hermione: Hermione & HtmlReporterApi;
    private _reportPath: string;
    private _reuse: boolean;
    private _db: null | Database.Database;
    private _queryCache: Map<string, unknown>;

    static create<T extends SqliteAdapter>(this: new (options: SqliteAdapterOptions) => T, options: SqliteAdapterOptions): T {
        return new this(options);
    }

    constructor({hermione, reportPath, reuse = false}: SqliteAdapterOptions) {
        this._hermione = hermione;
        this._reportPath = reportPath;
        this._reuse = reuse;
        this._db = null;
        this._queryCache = new Map();
    }

    async init(): Promise<void> {
        const dbPath = path.resolve(this._reportPath, LOCAL_DATABASE_NAME);
        const dbUrlsJsonPath = path.resolve(this._reportPath, DATABASE_URLS_JSON_NAME);

        try {
            if (!this._reuse) {
                await Promise.all([
                    fs.remove(dbPath),
                    fs.remove(dbUrlsJsonPath)
                ]);
            }

            await fs.ensureDir(this._reportPath);

            this._db = new Database(dbPath);
            debug('db connection opened');

            createTablesQuery().forEach((query) => this._db?.prepare(query).run());

            (this._hermione.htmlReporter as unknown as EventEmitter2).emit(this._hermione.htmlReporter.events.DATABASE_CREATED, this._db);
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            throw new NestedError(`Error creating database at "${dbPath}"`, err);
        }
    }

    close(): void {
        if (!this._db) {
            throw new DbNotInitializedError();
        }

        this._db.prepare('VACUUM').run();

        debug('db connection closed');
        this._db.close();
    }

    query<T = unknown>(queryParams: QueryParams = {}, ...queryArgs: string[]): T {
        if (!this._db) {
            throw new DbNotInitializedError();
        }

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

    write(testResult: ParseTestResultParams): void {
        if (!this._db) {
            throw new DbNotInitializedError();
        }

        const testResultObj = this._parseTestResult(testResult);
        const values = this._createValuesArray(testResultObj);

        const placeholders = values.map(() => '?').join(', ');
        this._db.prepare(`INSERT INTO ${DB_SUITES_TABLE_NAME} VALUES (${placeholders})`).run(...values);
    }

    delete(deleteParams: DeleteParams = {}, ...deleteArgs: string[]): void {
        if (!this._db) {
            throw new DbNotInitializedError();
        }

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

    _parseTestResult({suitePath, suiteName, testResult}: ParseTestResultParams): ParsedTestResult {
        const {
            name,
            suiteUrl,
            metaInfo,
            history,
            description,
            error,
            skipReason,
            imagesInfo,
            screenshot,
            multipleTabs,
            status,
            timestamp = Date.now()
        } = testResult;

        return {
            suitePath,
            suiteName,
            name,
            suiteUrl,
            metaInfo,
            history,
            description,
            error,
            skipReason,
            imagesInfo,
            screenshot,
            multipleTabs,
            status,
            timestamp
        };
    }

    private _createValuesArray(testResult: PreparedTestResult): (string | number | null)[] {
        return SUITES_TABLE_COLUMNS.reduce<(string | number | null)[]>((acc, {name}) => {
            const value = testResult[name as keyof PreparedTestResult];
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
