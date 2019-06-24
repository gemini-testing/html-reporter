'use strict';

const fs = require('fs-extra');
const {saveBase64Screenshot} = require('lib/reporter-helpers');
const utils = require('lib/server-utils');

describe('reporter-helpers', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(() => {
        sandbox.stub(utils, 'getCurrentAbsolutePath');
        sandbox.stub(utils.logger, 'warn');
        sandbox.stub(utils, 'makeDirFor').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
    });

    afterEach(() => sandbox.restore());

    describe('saveBase64Screenshot', () => {
        describe('if screenshot on reject does not exist', () => {
            it('should not save screenshot', () => {
                const test = {
                    screenshot: {base64: null}
                };

                return saveBase64Screenshot(test)
                    .then(() => assert.notCalled(fs.writeFile));
            });

            it('should warn about it', () => {
                const test = {
                    screenshot: {base64: null}
                };

                return saveBase64Screenshot(test)
                    .then(() => assert.calledWith(utils.logger.warn, 'Cannot save screenshot on reject'));
            });
        });

        it('should make directory for screenshot', () => {
            const test = {
                screenshot: {base64: 'base64-data'}
            };
            utils.getCurrentAbsolutePath.withArgs(test, 'report/path').returns('dest/path');

            return saveBase64Screenshot(test, 'report/path')
                .then(() => assert.calledOnceWith(utils.makeDirFor, 'dest/path'));
        });

        it('should save screenshot from base64 format', () => {
            const test = {
                screenshot: {base64: 'base64-data'}
            };
            const bufData = new Buffer('base64-data', 'base64');
            utils.getCurrentAbsolutePath.withArgs(test, 'report/path').returns('dest/path');

            return saveBase64Screenshot(test, 'report/path')
                .then(() => assert.calledOnceWith(fs.writeFile, 'dest/path', bufData, 'base64'));
        });
    });
});
