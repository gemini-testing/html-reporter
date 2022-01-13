'use strict';

const proxyquire = require('proxyquire');
const axios = require('axios');
const {fetchDataFromDatabases, mergeDatabases, connectToDatabase, getMainDatabaseUrl} = require('lib/sqlite-utils/client');
const {LOCAL_DATABASE_NAME} = require('lib/constants/file-names');

describe('lib/sqlite-utils/client', () => {
    const sandbox = sinon.sandbox.create();
    let windowOrig;

    beforeEach(() => {
        sandbox.stub(axios, 'get').resolves();
        windowOrig = global.window;
    });

    afterEach(() => {
        sandbox.restore();
        global.window = windowOrig;
    });

    describe('fetchDataFromDatabases', () => {
        it('should return empty arrays if dbUrls.json not contain useful data', async () => {
            axios.get.resolves({
                status: 200,
                data: {
                    dbUrls: [],
                    jsonUrls: []
                }
            });

            const fetchDbDetails = [];
            const dataForDbs = await fetchDataFromDatabases(['http://127.0.0.1:8080/urls.json']);

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

            const fetchDbResponses = await fetchDataFromDatabases(['http://127.0.0.1:8080/urls.json']);

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

            const fetchDbResponses = await fetchDataFromDatabases(['http://127.0.0.1:8080/urls.json']);

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

            const fetchDbResponses = await fetchDataFromDatabases(['http://127.0.0.1:8080/urls_main.json']);

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

            const fetchDbResponses = await fetchDataFromDatabases(['http://127.0.0.1:8080/urls.json']);

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

            const fetchDbResponses = await fetchDataFromDatabases(['http://127.0.0.1:8080/urls.json?key=value']);

            assert.includeDeepMembers(fetchDbResponses, [
                {status: 200, data: 'stub buffer', url: 'http://127.0.0.1:8080/sqlite.db?key=value'}
            ]);
        });
    });

    describe('mergeDatabases', () => {
        let SQL, statement;
        let DatabaseConstructorSpy;

        beforeEach(() => {
            statement = {
                step: () => {},
                get: () => {},
                run: () => {}
            };

            SQL = {
                Database: class {
                    run() {}
                    close() {}
                    prepare() {
                        return statement;
                    }
                }
            };
            DatabaseConstructorSpy = sinon.spy(SQL, 'Database');
            sandbox.spy(SQL.Database.prototype, 'prepare');
            sandbox.spy(SQL.Database.prototype, 'close');

            global.window = {
                initSqlJs: () => SQL
            };
        });

        it('should return null if dataForDbs is empty', async () => {
            const mergedDbConnection = await mergeDatabases([]);

            assert.equal(mergedDbConnection, null);
        });

        it('should not create unnecessary databases if passed data from single db', async () => {
            const data = new ArrayBuffer(1);

            const mergedDbConnection = await mergeDatabases([data]);

            assert.instanceOf(mergedDbConnection, SQL.Database);
            assert.calledOnceWith(DatabaseConstructorSpy, new Uint8Array(1));
            assert.notCalled(SQL.Database.prototype.prepare);
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

        describe('merge tables', () => {
            let mergeDatabases, mergeTables;

            beforeEach(() => {
                mergeTables = sandbox.stub();

                mergeDatabases = proxyquire('lib/sqlite-utils/client', {
                    './common': {mergeTables}
                }).mergeDatabases;
            });

            it('should get existing tables', async () => {
                const statement = {
                    step: sandbox.stub().returns(true).onThirdCall().returns(false),
                    get: sandbox.stub()
                        .onFirstCall().returns(['table1'])
                        .onSecondCall().returns(['table2'])
                };

                await mergeDatabases([new ArrayBuffer(1), new ArrayBuffer(2)]);
                const tables = mergeTables.getCall(0).args[0].getExistingTables(statement);

                assert.deepEqual(tables, ['table1', 'table2']);
            });
        });
    });

    describe('connectToDatabase', () => {
        let SQL, Database;

        beforeEach(() => {
            Database = function Database() {};
            SQL = {Database};

            global.window = {
                initSqlJs: sandbox.stub().resolves(SQL)
            };
        });

        it('should return connection to database', async () => {
            axios.get
                .withArgs('http://127.0.0.1:8080/sqlite.db', {responseType: 'arraybuffer'})
                .resolves({status: 200, data: 'stub buffer'});

            const db = await connectToDatabase('http://127.0.0.1:8080/sqlite.db');

            assert.instanceOf(db, Database);
        });
    });

    describe('getMainDatabaseUrl', () => {
        beforeEach(() => {
            global.window = {
                location: {
                    href: 'http://localhost/default/path.html'
                }
            };
        });

        it('should return url to main database', () => {
            global.window.location.href = 'http://127.0.0.1:8080/';

            const url = getMainDatabaseUrl();

            assert.equal(url.href, `http://127.0.0.1:8080/${LOCAL_DATABASE_NAME}`);
        });
    });
});
