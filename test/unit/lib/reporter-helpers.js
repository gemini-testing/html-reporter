'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const {UPDATED} = require('lib/constants');
const commonUtilsOriginal = require('lib/common-utils');

describe('lib/reporter-helpers', () => {
    const sandbox = sinon.sandbox.create();
    let reporterHelpers;
    let utils;
    let commonUtils;
    let fs;
    let streamPipeline;
    let imageStream;

    const mkImageInfo_ = (actualImgPath) => ({
        status: UPDATED,
        stateName: 'plain',
        actualImg: {path: actualImgPath},
        refImg: {path: '/ref/path/plain.png'},
        expectedImg: {path: 'old/path.png'}
    });

    const mkTestResult_ = (actualImgPath) => ({
        id: 'test-id',
        imagesInfo: [mkImageInfo_(actualImgPath)]
    });

    beforeEach(() => {
        commonUtils = _.clone(commonUtilsOriginal);
        imageStream = {};
        sandbox.stub(commonUtils, 'fetchFile').resolves({data: imageStream, status: 200});
        streamPipeline = sandbox.stub().resolves();

        fs = {
            createWriteStream: sandbox.stub().returns({})
        };

        utils = {
            getCurrentAbsolutePath: sandbox.stub(),
            getReferencePath: sandbox.stub().returns('images/plain/reference.png'),
            copyFileAsync: sandbox.stub().resolves(),
            fileExists: sandbox.stub().returns(false),
            makeDirFor: sandbox.stub().resolves()
        };

        reporterHelpers = proxyquire('lib/reporter-helpers', {
            './common-utils': commonUtils,
            './server-utils': utils,
            './adapters/test-result/utils': {
                copyAndUpdate: sandbox.stub().callsFake((source, data) => _.assign(source, data))
            },
            'fs-extra': fs,
            'stream/promises': {pipeline: streamPipeline}
        });
    });

    afterEach(() => sandbox.restore());

    it('should copy local actual image paths as files', async () => {
        const onReferenceUpdateCb = sandbox.stub();
        const testResult = mkTestResult_('images/plain/current.png');

        await reporterHelpers.updateReferenceImages(testResult, '/report', onReferenceUpdateCb);

        assert.calledWith(utils.copyFileAsync.firstCall, '/report/images/plain/current.png', '/ref/path/plain.png');
        assert.calledWith(utils.copyFileAsync.secondCall, '/report/images/plain/current.png', '/report/images/plain/reference.png');
    });

    it('should fetch remote actual image paths and save to destinations', async () => {
        const onReferenceUpdateCb = sandbox.stub();
        const testResult = mkTestResult_('https://domain.com/images/current.png');

        await reporterHelpers.updateReferenceImages(testResult, '/report', onReferenceUpdateCb);

        assert.calledOnceWith(commonUtils.fetchFile, 'https://domain.com/images/current.png', {responseType: 'stream'});
        assert.calledOnceWith(fs.createWriteStream, '/ref/path/plain.png');
        assert.calledOnceWith(streamPipeline, imageStream, fs.createWriteStream.firstCall.returnValue);
        assert.calledWith(utils.copyFileAsync, '/ref/path/plain.png', '/report/images/plain/reference.png');
    });
});
