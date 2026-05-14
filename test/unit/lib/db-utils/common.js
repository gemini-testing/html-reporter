'use strict';

const {handleDatabases, makeDbFileDownloadErrorMessage} = require('lib/db-utils/common');

describe('lib/db-utils/common', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    const mkOpts_ = (loadDbJsonUrl) => ({
        pluginConfig: {path: '/report'},
        loadDbJsonUrl,
        prepareUrls: sandbox.stub().returns([]),
        loadDbUrl: sandbox.stub().resolves('/report/sqlite.db')
    });

    describe('handleDatabases', () => {
        it('should throw detailed error with download reason in strict mode', async () => {
            const error = new Error('Request failed with status code 403');
            const loadDbJsonUrl = sandbox.stub().resolves({data: null, status: 403, error});

            const promise = handleDatabases(['https://example.com/report/databaseUrls.json'], {
                ...mkOpts_(loadDbJsonUrl),
                strict: true
            });

            let err;
            try {
                await promise;
            } catch (e) {
                err = e;
            }

            assert.include(err.message, 'Cannot download file from "https://example.com/report/databaseUrls.json');
            assert.include(err.message, 'Request failed with status code 403');
        });

        it('should throw detailed error with status when strict response has no data', async () => {
            const loadDbJsonUrl = sandbox.stub().resolves({data: null, status: 200});

            const promise = handleDatabases(['/report/databaseUrls.json'], {
                ...mkOpts_(loadDbJsonUrl),
                strict: true
            });

            let err;
            try {
                await promise;
            } catch (e) {
                err = e;
            }

            assert.include(err.message, 'Cannot download file from "/report/databaseUrls.json"');
            assert.include(err.message, 'request failed with status 200');
        });
    });
});
