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
        sandbox.stub(commonUtils, 'fetchFile').resolves({data: Buffer.from('img-data'), status: 200});

        fs = {writeFile: sandbox.stub().resolves()};

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
            'fs-extra': fs
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

        assert.calledOnceWith(commonUtils.fetchFile, 'https://domain.com/images/current.png', {responseType: 'arraybuffer'});
        assert.calledWith(fs.writeFile.firstCall, '/ref/path/plain.png', sinon.match.instanceOf(Buffer));
        assert.calledWith(fs.writeFile.secondCall, '/report/images/plain/reference.png', sinon.match.instanceOf(Buffer));
    });
});
