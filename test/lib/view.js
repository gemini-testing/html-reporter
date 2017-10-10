'use strict';

const Promise = require('bluebird');
const fs = require('fs-extra');

const view = require('../../lib/view');
const logger = require('../../utils').logger;

describe('Veiw', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(fs, 'mkdirsAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'writeFileAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'copyAsync').returns(Promise.resolve());

        sandbox.stub(logger, 'log');
    });

    afterEach(() => sandbox.restore());

    describe('save', () => {
        it('should save data with tests result to passed dir', () => {
            return view.save({test1: 'some-data'}, 'some/report/dir').then(() => {
                const expectedData = 'var data = {"test1":"some-data"};\n'
                    + 'try { module.exports = data; } catch(e) {}';

                assert.calledWith(fs.mkdirsAsync, 'some/report/dir');
                assert.calledWith(fs.writeFileAsync, 'some/report/dir/data.js', expectedData, 'utf8');
            });
        });

        it('should copy static files to report dir', () => {
            return view.save('some-data', 'some/report/dir')
                .then(() => {
                    assert.calledWithMatch(fs.copyAsync, 'index.html', 'some/report/dir/index.html');
                    assert.calledWithMatch(fs.copyAsync, 'bundle.min.js', 'some/report/dir/bundle.min.js');
                    assert.calledWithMatch(fs.copyAsync, 'bundle.min.css', 'some/report/dir/bundle.min.css');
                });
        });

        it('should log an error', () => {
            fs.mkdirsAsync.returns(Promise.reject('some-error'));

            return view.save().then(() => assert.calledWith(logger.log, 'some-error'));
        });
    });
});
