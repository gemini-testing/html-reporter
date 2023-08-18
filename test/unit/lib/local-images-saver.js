'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const originalUtils = require('lib/server-utils');

describe('local-images-saver', () => {
    let imagesSaver, utils;
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        utils = _.clone(originalUtils);
        sandbox.stub(utils, 'copyFileAsync');

        imagesSaver = proxyquire('lib/local-images-saver', {
            './server-utils': utils
        }).LocalImagesSaver;
    });

    afterEach(() => sandbox.restore());

    it('should save image', async () => {
        await imagesSaver.saveImg('local/path/img.png', {destPath: 'dest/path/img.png', reportDir: 'rep/dir'});

        assert.calledWith(utils.copyFileAsync, 'local/path/img.png', 'dest/path/img.png', {reportDir: 'rep/dir'});
    });

    it('should return dest path', async () => {
        const imgPath = await imagesSaver.saveImg('local/path/img.png', {destPath: 'dest/path/img.png'});

        assert.equal(imgPath, 'dest/path/img.png');
    });
});
