'use strict';

const utils = require('lib/server-utils');
const imagesSaver = require('lib/images-saver');

describe('images-saver', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        sandbox.stub(utils, 'copyImageAsync');
    });

    afterEach(() => sandbox.restore());

    it('should save image', async () => {
        await imagesSaver.saveImg('local/path', {destPath: 'dest/path', reportDir: 'rep/dir'});

        assert.calledWith(utils.copyImageAsync, 'local/path', 'dest/path', 'rep/dir');
    });

    it('should return dest path', async () => {
        const imgPath = await imagesSaver.saveImg('local/path', {destPath: 'dest/path'});

        assert.equal(imgPath, 'dest/path');
    });
});
