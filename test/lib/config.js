'use strict';

const parseConfig = require('../../lib/config');

describe('config', () => {
    afterEach(() => delete process.env['html_reporter_path']);

    it('should be enabled by default', () => {
        assert.equal(parseConfig({}).enabled, true);
    });

    describe('html report path', () => {
        it('should set from configuration file', () => {
            const config = parseConfig({path: 'some/report/path'});

            assert.equal(config.path, 'some/report/path');
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_path'] = 'env/report/path';

            assert.equal(parseConfig({}).path, 'env/report/path');
        });
    });

    describe('default view settings', () => {
        it('should show all suites by default', () => {
            assert.equal(parseConfig({}).defaultView, 'all');
        });

        it('should set from configuration file', () => {
            const config = parseConfig({defaultView: 'some-view'});

            assert.equal(config.defaultView, 'some-view');
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_default_view'] = 'env/some-view';

            assert.equal(parseConfig({}).defaultView, 'env/some-view');
        });
    });
});
