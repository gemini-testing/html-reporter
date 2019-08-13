'use strict';

const parseConfig = require('lib/config');
const {config: configDefaults} = require('lib/constants/defaults');

describe('config', () => {
    beforeEach(function() {
        this.oldArgv = process.argv;
    });

    afterEach(function() {
        process.argv = this.oldArgv;

        delete process.env['html_reporter_enabled'];
        delete process.env['html_reporter_path'];
        delete process.env['html_reporter_default_view'];
        delete process.env['html_reporter_base_host'];
        delete process.env['html_reporter_scale_images'];
        delete process.env['html_reporter_lazy_load_offset'];
        delete process.env['html_reporter_meta_info_base_urls'];
    });

    describe('"enabled" option', () => {
        it('should be true by default', () => {
            assert.isTrue(parseConfig({}).enabled);
        });

        it('should set from configuration file', () => {
            const config = parseConfig({enabled: false});

            assert.isFalse(config.enabled);
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_enabled'] = 'false';

            assert.isFalse(parseConfig({}).enabled);
        });

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-enabled', 'false');

            assert.isFalse(parseConfig({}).enabled);
        });
    });

    describe('"path" option', () => {
        it('should be "html-report" by default', () => {
            assert.equal(parseConfig({}).path, 'html-report');
        });

        it('should set from configuration file', () => {
            const config = parseConfig({path: 'some/report/path'});

            assert.equal(config.path, 'some/report/path');
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_path'] = 'env/report/path';

            assert.equal(parseConfig({}).path, 'env/report/path');
        });

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-path', 'cli/report/path');

            assert.equal(parseConfig({}).path, 'cli/report/path');
        });
    });

    describe('"defaultView" option', () => {
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

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-default-view', 'cli/some-view');

            assert.equal(parseConfig({}).defaultView, 'cli/some-view');
        });
    });

    describe('"baseHost" option', () => {
        it('should be empty by default', () => {
            assert.equal(parseConfig({}).baseHost, '');
        });

        it('should set from configuration file', () => {
            const config = parseConfig({baseHost: 'some-host'});

            assert.equal(config.baseHost, 'some-host');
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_base_host'] = 'env/some-host';

            assert.equal(parseConfig({}).baseHost, 'env/some-host');
        });

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-base-host', 'cli/some-host');

            assert.equal(parseConfig({}).baseHost, 'cli/some-host');
        });
    });

    describe('"scaleImages" option', () => {
        it('should be false by default', () => {
            assert.isFalse(parseConfig({}).scaleImages);
        });

        it('should set from configuration file', () => {
            const config = parseConfig({scaleImages: true});

            assert.isTrue(config.scaleImages);
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_scale_images'] = 'true';

            assert.isTrue(parseConfig({}).scaleImages);
        });

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-scale-images', 'true');

            assert.isTrue(parseConfig({}).scaleImages);
        });
    });

    describe('"lazyLoadOffset" option', () => {
        it('should has default value', () => {
            assert.equal(parseConfig({}).lazyLoadOffset, configDefaults.lazyLoadOffset);
        });

        it('should set from configuration file', () => {
            const config = parseConfig({
                lazyLoadOffset: 700
            });

            assert.equal(config.lazyLoadOffset, 700);
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_lazy_load_offset'] = 600;

            assert.equal(parseConfig({}).lazyLoadOffset, 600);
        });

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-lazy-load-offset', 500);

            assert.equal(parseConfig({}).lazyLoadOffset, 500);
        });

        it('should validate if passed value is number', () => {
            assert.throws(() => parseConfig({lazyLoadOffset: 'some-value'}), /option must be number, but got string/);
        });
    });

    describe('"metaInfoBaseUrls" option', () => {
        it('should set from configuration file', () => {
            const config = parseConfig({
                metaInfoBaseUrls: {
                    file: 'base/path'
                }
            });

            assert.deepEqual(config.metaInfoBaseUrls, {file: 'base/path'});
        });

        it('should be set from environment variable', () => {
            process.env['html_reporter_meta_info_base_urls'] = '{"file": "base/path"}';

            assert.deepEqual(parseConfig({}).metaInfoBaseUrls, {file: 'base/path'});
        });

        it('should be set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-meta-info-base-urls', '{"file":"base/path"}');

            assert.deepEqual(parseConfig({}).metaInfoBaseUrls, {file: 'base/path'});
        });

        it('should validate if passed value is string', () => {
            assert.throws(() => parseConfig({metaInfoBaseUrls: 'some/urls'}), /option must be object, but got string/);
        });

        it('should validate if passed to object value is number', () => {
            assert.throws(() => parseConfig({metaInfoBaseUrls: {file: 10}}), /option must be string, but got number/);
        });
    });
});
