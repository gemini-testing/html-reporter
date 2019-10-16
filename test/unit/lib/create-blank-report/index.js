'use strict';

const path = require('path');
const fs = require('fs-extra');
const createBlankReport = require('lib/create-blank-report');
const DataTree = require('lib/merge-reports/data-tree');
const serverUtils = require('lib/server-utils');
const {stubTool} = require('../../utils');

describe('lib/create-blank-report', () => {
    const sandbox = sinon.sandbox.create();

    const createBlankReport_ = async (hermione, pluginConfig, destPath = 'default-dest-report/path') => {
        return await createBlankReport(hermione, pluginConfig, destPath);
    };

    const events = {
        CLI: 'cli',
        INIT: 'init'
    };

    // const config = {};
    const config = {
        defaultView: 'failed',
        baseHost: 'test',
        scaleImages: false,
        lazyLoadOffset: 2500,
        errorPatterns: []
    };
    const hermioneTool = stubTool({pluginConfig: {path: 'some/report/dir'}}, Object.assign(events, {RUNNER_END: 'runnerEnd'}));

    beforeEach(() => {
        sandbox.stub(serverUtils, 'require').returns({});
        sandbox.stub(serverUtils, 'prepareCommonJSData');
        sandbox.stub(serverUtils.logger, 'warn');
        sandbox.stub(fs, 'move');
        sandbox.stub(fs, 'writeFile');
        sandbox.stub(fs, 'copy').resolves();
        sandbox.stub(fs, 'readdir').resolves([]);

        sandbox.stub(DataTree, 'create').returns(Object.create(DataTree.prototype));
        sandbox.stub(DataTree.prototype, 'mergeWith').resolves();
    });

    afterEach(() => sandbox.restore());

    describe('save', () => {
        it('should move static files to destination folder', async () => {
            fs.readdir.resolves(['file-path']);
            const destFilePath = path.resolve('dest-report', 'path');
            await createBlankReport_(hermioneTool, config, 'dest-report/path');

            assert.calledWithMatch(fs.copy, 'index.html', path.join(destFilePath, 'index.html'));
            assert.calledWithMatch(fs.copy, 'report.min.js', path.join(destFilePath, 'report.min.js'));
            assert.calledWithMatch(fs.copy, 'report.min.css', path.join(destFilePath, 'report.min.css'));
        });

        it('should move sql.js files to destination folder', async () => {
            fs.readdir.resolves(['file-path']);
            const destFilePath = path.resolve('dest-report', 'path');
            await createBlankReport_(hermioneTool, config, 'dest-report/path');

            assert.calledWithMatch(fs.copy, 'sql-wasm.js', path.join(destFilePath, 'sql-wasm.js'));
        });

        it('should write "data.js"  to destination folder', async () => {
            fs.readdir.resolves(['file-path']);
            const destFilePath = path.resolve('dest-report', 'path');
            await createBlankReport_(hermioneTool, config, 'dest-report/path');

            assert.calledWithMatch(fs.writeFile, path.join(destFilePath, 'data.js'));
        });
    });
});
