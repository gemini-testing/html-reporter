'use strict';

import axios from 'axios';
import * as _ from 'lodash';

import {
    fetchDatabases,
    mergeDatabases
} from 'lib/static/modules/sqlite';

describe('lib/static/modules/sqlite', () => {
    const sandbox = sinon.sandbox.create();

    describe('fetchDatabases', () => {
        beforeEach(() => {
            sandbox.stub(axios, 'get').resolves();
        });

        afterEach(() => sandbox.restore());

        it('should return empty arrays if dbUrls.json not contain useful data', async () => {
            axios.get.resolves({
                status: 200,
                data: {
                    dbUrls: [],
                    jsonUrls: []
                }
            });

            const fetchDbDetails = [];
            const dataForDbs = await fetchDatabases(['http://127.0.0.1:8080/urls.json'], fetchDbDetails);

            assert.lengthOf(dataForDbs, 0);
            assert.lengthOf(fetchDbDetails, 0);
        });

        it('should fetch single database', async () => {
            axios.get.withArgs('http://127.0.0.1:8080/urls.json').resolves({
                status: 200,
                data: {
                    dbUrls: ['sqlite.db'],
                    jsonUrls: []
                }
            });
            axios.get.withArgs('http://127.0.0.1:8080/sqlite.db', {responseType: 'arraybuffer'}).resolves({
                status: 200,
                data: 'stub buffer'
            });

            const fetchDbResponses = await fetchDatabases(['http://127.0.0.1:8080/urls.json']);

            assert.includeDeepMembers(fetchDbResponses, [
                {status: 200, data: 'stub buffer', url: 'http://127.0.0.1:8080/sqlite.db'}
            ]);
        });

        it('should recursive fetch databases', async () => {
            axios.get.withArgs('http://127.0.0.1:8080/urls.json').resolves({
                status: 200,
                data: {
                    dbUrls: ['sqlite.db'],
                    jsonUrls: ['http://foo-bar.ru/urls.json']
                }
            });
            axios.get.withArgs('http://foo-bar.ru/urls.json').resolves({
                status: 200,
                data: {
                    dbUrls: ['sqlite.db'],
                    jsonUrls: ['http://foo-bar.ru/same/path/urls.json']
                }
            });
            axios.get.withArgs('http://foo-bar.ru/same/path/urls.json').resolves({
                status: 200,
                data: {
                    dbUrls: ['sqlite.db'],
                    jsonUrls: []
                }
            });
            axios.get.withArgs('http://127.0.0.1:8080/sqlite.db', {responseType: 'arraybuffer'}).resolves({
                status: 201,
                data: 'stub first'
            });
            axios.get.withArgs('http://foo-bar.ru/sqlite.db', {responseType: 'arraybuffer'}).resolves({
                status: 202,
                data: 'stub second'
            });
            axios.get.withArgs('http://foo-bar.ru/same/path/sqlite.db', {responseType: 'arraybuffer'}).resolves({
                status: 203,
                data: 'stub third'
            });

            const fetchDbResponses = await fetchDatabases(['http://127.0.0.1:8080/urls.json']);

            assert.includeDeepMembers(fetchDbResponses, [
                {status: 201, data: 'stub first', url: 'http://127.0.0.1:8080/sqlite.db'},
                {status: 202, data: 'stub second', url: 'http://foo-bar.ru/sqlite.db'},
                {status: 203, data: 'stub third', url: 'http://foo-bar.ru/same/path/sqlite.db'}
            ]);
        });

        it('should add info if fetch dbUrls.json rejected', async () => {
            axios.get.withArgs('http://127.0.0.1:8080/urls_main.json').resolves({
                status: 200,
                data: {
                    dbUrls: [],
                    jsonUrls: ['urls_first.json', 'urls_second.json']
                }
            });
            axios.get.withArgs('http://127.0.0.1:8080/urls_first.json').rejects('error');
            axios.get.withArgs('http://127.0.0.1:8080/urls_second.json').rejects({response: {status: 404}});

            const fetchDbResponses = await fetchDatabases(['http://127.0.0.1:8080/urls_main.json']);

            assert.includeDeepMembers(fetchDbResponses, [
                {status: 'unknown', data: null, url: 'http://127.0.0.1:8080/urls_first.json'},
                {status: 404, data: null, url: 'http://127.0.0.1:8080/urls_second.json'}
            ]);
        });

        it('should add info if fetch db rejected', async () => {
            axios.get.withArgs('http://127.0.0.1:8080/urls.json').resolves({
                status: 200,
                data: {
                    dbUrls: ['sqlite_first.db', 'sqlite_second.db'],
                    jsonUrls: []
                }
            });
            axios.get
                .withArgs('http://127.0.0.1:8080/sqlite_first.db', {responseType: 'arraybuffer'})
                .rejects('error');
            axios.get
                .withArgs('http://127.0.0.1:8080/sqlite_second.db', {responseType: 'arraybuffer'})
                .rejects({response: {status: 404}});

            const fetchDbResponses = await fetchDatabases(['http://127.0.0.1:8080/urls.json']);

            assert.includeDeepMembers(fetchDbResponses, [
                {status: 'unknown', data: null, url: 'http://127.0.0.1:8080/sqlite_first.db'},
                {status: 404, data: null, url: 'http://127.0.0.1:8080/sqlite_second.db'}
            ]);
        });

        it('should fetch database by relative URL with use parameters from base url', async () => {
            axios.get.withArgs('http://127.0.0.1:8080/urls.json?key=value').resolves({
                status: 200,
                data: {
                    dbUrls: ['sqlite.db'],
                    jsonUrls: []
                }
            });
            axios.get
                .withArgs('http://127.0.0.1:8080/sqlite.db?key=value', {responseType: 'arraybuffer'})
                .resolves({status: 200, data: 'stub buffer'});

            const fetchDbResponses = await fetchDatabases(['http://127.0.0.1:8080/urls.json?key=value']);

            assert.includeDeepMembers(fetchDbResponses, [
                {status: 200, data: 'stub buffer', url: 'http://127.0.0.1:8080/sqlite.db?key=value'}
            ]);
        });
    });

    describe('mergeDatabases', () => {
        let SQL;
        let DatabaseConstructorSpy;

        beforeEach(() => {
            SQL = {
                Database: class {
                    run() {}
                    close() {}
                }
            };
            DatabaseConstructorSpy = sinon.spy(SQL, 'Database');
            sandbox.spy(SQL.Database.prototype, 'run');
            sandbox.spy(SQL.Database.prototype, 'close');

            global.window = {
                initSqlJs: () => SQL
            };
        });

        afterEach(() => {
            global.window = undefined;
            sandbox.restore();
        });

        describe('mergeDatabases', () => {
            it('should return null if dataForDbs is empty', async () => {
                const mergedDbConnection = await mergeDatabases([]);

                assert.equal(mergedDbConnection, null);
            });

            it('should not create unnecessary databases if dataForDbs contain data for single db', async () => {
                const data = new ArrayBuffer(1);

                const mergedDbConnection = await mergeDatabases([data]);

                assert.instanceOf(mergedDbConnection, SQL.Database);
                assert.calledOnceWith(DatabaseConstructorSpy, new Uint8Array(1));
                assert.notCalled(SQL.Database.prototype.run);
                assert.notCalled(SQL.Database.prototype.close);
            });

            it('should merge several chunk databases into one', async () => {
                const chunkSize1 = 1;
                const chunkSize2 = 2;
                const sumOfChunkSizes = chunkSize1 + chunkSize2;
                const data1 = new ArrayBuffer(chunkSize1);
                const data2 = new ArrayBuffer(chunkSize2);

                const mergedDbConnection = await mergeDatabases([data1, data2]);

                assert.instanceOf(mergedDbConnection, SQL.Database);
                assert.calledThrice(DatabaseConstructorSpy);
                assert.calledWith(DatabaseConstructorSpy, new Uint8Array(chunkSize1));
                assert.calledWith(DatabaseConstructorSpy, new Uint8Array(chunkSize2));
                assert.calledWith(DatabaseConstructorSpy, undefined, sumOfChunkSizes);
                assert.calledTwice(SQL.Database.prototype.close);
            });

            it('should merge both "suites" tables', async () => {
                const data1 = new ArrayBuffer(1);
                const data2 = new ArrayBuffer(1);

                await mergeDatabases([data1, data2]);

                const rawQueries = _
                    .flatten(SQL.Database.prototype.run.args)
                    .join(' ');

                assert.include(rawQueries, 'suites');
            });
        });
    });
});
