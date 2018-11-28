'use strict';
var parseConfig = require('../../lib/config');
var configDefaults = require('../../lib/constants/defaults').config;
describe('config', function () {
    beforeEach(function () {
        this.oldArgv = process.argv;
    });
    afterEach(function () {
        process.argv = this.oldArgv;
        delete process.env['html_reporter_enabled'];
        delete process.env['html_reporter_path'];
        delete process.env['html_reporter_default_view'];
        delete process.env['html_reporter_base_host'];
        delete process.env['html_reporter_scale_images'];
        delete process.env['html_reporter_lazy_load_offset'];
    });
    describe('"enabled" option', function () {
        it('should be true by default', function () {
            assert.isTrue(parseConfig({}).enabled);
        });
        it('should set from configuration file', function () {
            var config = parseConfig({ enabled: false });
            assert.isFalse(config.enabled);
        });
        it('should set from environment variable', function () {
            process.env['html_reporter_enabled'] = 'false';
            assert.isFalse(parseConfig({}).enabled);
        });
        it('should set from cli', function () {
            process.argv = process.argv.concat('--html-reporter-enabled', 'false');
            assert.isFalse(parseConfig({}).enabled);
        });
    });
    describe('"path" option', function () {
        it('should be "html-report" by default', function () {
            assert.equal(parseConfig({}).path, 'html-report');
        });
        it('should set from configuration file', function () {
            var config = parseConfig({ path: 'some/report/path' });
            assert.equal(config.path, 'some/report/path');
        });
        it('should set from environment variable', function () {
            process.env['html_reporter_path'] = 'env/report/path';
            assert.equal(parseConfig({}).path, 'env/report/path');
        });
        it('should set from cli', function () {
            process.argv = process.argv.concat('--html-reporter-path', 'cli/report/path');
            assert.equal(parseConfig({}).path, 'cli/report/path');
        });
    });
    describe('"defaultView" option', function () {
        it('should show all suites by default', function () {
            assert.equal(parseConfig({}).defaultView, 'all');
        });
        it('should set from configuration file', function () {
            var config = parseConfig({ defaultView: 'some-view' });
            assert.equal(config.defaultView, 'some-view');
        });
        it('should set from environment variable', function () {
            process.env['html_reporter_default_view'] = 'env/some-view';
            assert.equal(parseConfig({}).defaultView, 'env/some-view');
        });
        it('should set from cli', function () {
            process.argv = process.argv.concat('--html-reporter-default-view', 'cli/some-view');
            assert.equal(parseConfig({}).defaultView, 'cli/some-view');
        });
    });
    describe('"baseHost" option', function () {
        it('should be empty by default', function () {
            assert.equal(parseConfig({}).baseHost, '');
        });
        it('should set from configuration file', function () {
            var config = parseConfig({ baseHost: 'some-host' });
            assert.equal(config.baseHost, 'some-host');
        });
        it('should set from environment variable', function () {
            process.env['html_reporter_base_host'] = 'env/some-host';
            assert.equal(parseConfig({}).baseHost, 'env/some-host');
        });
        it('should set from cli', function () {
            process.argv = process.argv.concat('--html-reporter-base-host', 'cli/some-host');
            assert.equal(parseConfig({}).baseHost, 'cli/some-host');
        });
    });
    describe('"scaleImages" option', function () {
        it('should be false by default', function () {
            assert.isFalse(parseConfig({}).scaleImages);
        });
        it('should set from configuration file', function () {
            var config = parseConfig({ scaleImages: true });
            assert.isTrue(config.scaleImages);
        });
        it('should set from environment variable', function () {
            process.env['html_reporter_scale_images'] = 'true';
            assert.isTrue(parseConfig({}).scaleImages);
        });
        it('should set from cli', function () {
            process.argv = process.argv.concat('--html-reporter-scale-images', 'true');
            assert.isTrue(parseConfig({}).scaleImages);
        });
    });
    describe('"lazyLoadOffset" option', function () {
        it('should has default value', function () {
            assert.equal(parseConfig({}).lazyLoadOffset, configDefaults.lazyLoadOffset);
        });
        it('should set from configuration file', function () {
            var config = parseConfig({
                lazyLoadOffset: 700
            });
            assert.equal(config.lazyLoadOffset, 700);
        });
        it('should set from environment variable', function () {
            process.env['html_reporter_lazy_load_offset'] = 600;
            assert.equal(parseConfig({}).lazyLoadOffset, 600);
        });
        it('should set from cli', function () {
            process.argv = process.argv.concat('--html-reporter-lazy-load-offset', 500);
            assert.equal(parseConfig({}).lazyLoadOffset, 500);
        });
        it('should validate if passed value is number', function () {
            assert.throws(function () { return parseConfig({ lazyLoadOffset: 'some-value' }); }, /option must be number, but got string/);
        });
    });
});
//# sourceMappingURL=config.js.map