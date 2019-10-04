'use strict';

const path = require('path');
const fs = require('fs-extra');
const ReportBuilder = require('lib/merge-reports/report-builder');
const DataTree = require('lib/merge-reports/data-tree');
const serverUtils = require('lib/server-utils');

describe('lib/merge-reports/report-builder', () => {
    const sandbox = sinon.sandbox.create();

    const buildReport_ = async (srcPaths, destPath = 'default-dest-report/path') => {
        return await ReportBuilder.create(srcPaths, destPath).build();
    };

    beforeEach(() => {
        sandbox.stub(serverUtils, 'require').returns({});
        sandbox.stub(serverUtils, 'prepareCommonJSData');
        sandbox.stub(serverUtils.logger, 'warn');
        sandbox.stub(fs, 'move');
        sandbox.stub(fs, 'writeFile');
        sandbox.stub(fs, 'readdir').resolves([]);
        sandbox.stub(fs, 'stat');
        sandbox.stub(fs, 'ensureDir');

        sandbox.stub(DataTree, 'create').returns(Object.create(DataTree.prototype));
        sandbox.stub(DataTree.prototype, 'mergeWith').resolves();
    });

    afterEach(() => sandbox.restore());

    describe('should move source reports to destination report', () => {
        const fsStubReportWithFolder_ = (reportPath, folderPath, filePath) => {
            fs.readdir.withArgs(path.resolve(reportPath)).resolves([folderPath]);

            const folderFullPath = path.resolve(reportPath, folderPath);
            fs.readdir.withArgs(folderFullPath).resolves([filePath]);

            fs.stat.withArgs(folderFullPath).resolves({isDirectory: () => true});

            const srcFilePath = path.resolve(reportPath, folderPath, filePath);
            fs.stat.withArgs(srcFilePath).resolves({isDirectory: () => false});

            return srcFilePath;
        };

        it('including all subfolders', async () => {
            const srcFooFilePath = fsStubReportWithFolder_('foo/src-report', 'folder-path', 'file-path');
            const srcBarFilePath = fsStubReportWithFolder_('bar/src-report', 'folder-path', 'file-path');

            const destFilePath = path.resolve('buz/dest-report', 'folder-path', 'file-path');

            await buildReport_(['foo/src-report', 'bar/src-report'], 'buz/dest-report');

            assert.calledWith(fs.move, srcFooFilePath, destFilePath, {overwrite: true});
            assert.calledWith(fs.move, srcBarFilePath, destFilePath, {overwrite: true});
        });

        it('skipping images folders', async () => {
            fsStubReportWithFolder_('foo/src-report', 'images', 'file-path');
            fsStubReportWithFolder_('bar/src-report', 'images', 'file-path');

            await buildReport_(['foo/src-report', 'bar/src-report'], 'buz/dest-report');

            assert.notCalled(fs.move);
        });

        it('skipping "data.js"', async () => {
            fs.readdir.resolves(['file-path', 'data.js']);
            fs.stat.resolves({isDirectory: () => false});

            const srcDataPath = path.resolve('src-report/path-1', 'data.js');
            const destPath = path.resolve('dest-report/path');

            await buildReport_(['src-report/path-1', 'src-report/path-2'], 'dest-report/path');

            assert.neverCalledWith(fs.move, srcDataPath, destPath);
        });
    });

    it('should not fail if data file does not find in source report path', async () => {
        const srcDataPath1 = path.resolve('src-report/path-1', 'data');
        serverUtils.require.withArgs(srcDataPath1).throws(new Error('Cannot find module'));

        await assert.isFulfilled(buildReport_(['src-report/path-1', 'src-report/path-2']));
    });

    it('should log a warning that there is no data file in source report path', async () => {
        const srcDataPath1 = path.resolve('src-report/path-1', 'data');
        serverUtils.require.withArgs(srcDataPath1).throws(new Error('Cannot find module'));

        await buildReport_(['src-report/path-1', 'src-report/path-2']);

        assert.calledWithMatch(
            serverUtils.logger.warn,
            'Not found data file in passed source report path: src-report/path-1'
        );
    });

    it('should read source data files from reports', async () => {
        const srcDataPath1 = path.resolve('src-report/path-1', 'data');
        const srcDataPath2 = path.resolve('src-report/path-2', 'data');

        await buildReport_(['src-report/path-1', 'src-report/path-2']);

        assert.calledTwice(serverUtils.require);
        assert.calledWith(serverUtils.require, srcDataPath1);
        assert.calledWith(serverUtils.require, srcDataPath2);
    });

    it('should create "DataTree" instance with passed data from first source path and destination path', async () => {
        const srcDataPath1 = path.resolve('src-report/path-1', 'data');
        serverUtils.require.withArgs(srcDataPath1).returns('report-data-1');

        await buildReport_(['src-report/path-1', 'src-report/path-2'], 'dest-report/path');

        assert.calledOnceWith(DataTree.create, 'report-data-1', 'dest-report/path');
    });

    it('should merge datas with passed source data collection execept the first one', async () => {
        const srcDataPath2 = path.resolve('src-report/path-2', 'data');
        serverUtils.require.withArgs(srcDataPath2).returns('report-data-2');

        await buildReport_(['src-report/path-1', 'src-report/path-2']);

        assert.calledOnceWith(DataTree.prototype.mergeWith, {'src-report/path-2': 'report-data-2'});
    });

    it('should convert merged data to commonjs format', async () => {
        DataTree.prototype.mergeWith.resolves('merged-data');

        await buildReport_(['src-report/path-1', 'src-report/path-2']);

        assert.calledOnceWith(serverUtils.prepareCommonJSData, 'merged-data');
    });

    it('should write merged data to destination report', async () => {
        serverUtils.prepareCommonJSData.returns('prepared-data');

        await buildReport_(['src-report/path-1', 'src-report/path-2'], 'dest-report/path');

        const destDataPath = path.resolve('dest-report/path', 'data.js');

        assert.calledOnceWith(fs.writeFile, destDataPath, 'prepared-data');
    });
});
