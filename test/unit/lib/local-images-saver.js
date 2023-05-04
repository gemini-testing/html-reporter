'use strict';

const utils = require('lib/server-utils');
const imagesSaver = require('lib/local-images-saver');

describe('local-images-saver', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        sandbox.stub(utils, 'copyFileAsync');
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
