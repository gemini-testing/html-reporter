'use strict';

const {isEmpty} = require('lodash');
const {parseConfig} = require('lib/config');
const {configDefaults} = require('lib/constants/defaults');
const {ViewMode} = require('lib/constants/view-modes');
const {DiffModes} = require('lib/constants/diff-modes');
const {SaveFormat} = require('lib/constants/save-formats');
const SUPPORTED_CONTROL_TYPES = Object.values(require('lib/gui/constants/custom-gui-control-types'));
const {logger} = require('lib/common-utils');

describe('config', () => {
    const sandbox = sinon.createSandbox();

    beforeEach(function() {
        sandbox.stub(logger, 'warn');

        this.oldArgv = process.argv;
    });

    afterEach(function() {
        sandbox.restore();

        process.argv = this.oldArgv;

        delete process.env['html_reporter_enabled'];
        delete process.env['html_reporter_path'];
        delete process.env['html_reporter_default_view'];
        delete process.env['html_reporter_base_host'];
        delete process.env['html_reporter_scale_images'];
        delete process.env['html_reporter_lazy_load_offset'];
        delete process.env['html_reporter_meta_info_base_urls'];
        delete process.env['html_reporter_plugins_enabled'];
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

    describe('"saveFormat" option', () => {
        it(`should be ${SaveFormat.SQLITE} by default`, () => {
            assert.equal(parseConfig({}).saveFormat, SaveFormat.SQLITE);
        });
    });

    describe('"saveErrorDetails" option', () => {
        it('should be false by default', () => {
            assert.isFalse(parseConfig({}).saveErrorDetails);
        });

        it('should set from configuration file', () => {
            const config = parseConfig({saveErrorDetails: true});

            assert.isTrue(config.saveErrorDetails);
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_save_error_details'] = 'true';

            assert.isTrue(parseConfig({}).saveErrorDetails);
        });

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-save-error-details', 'true');

            assert.isTrue(parseConfig({}).saveErrorDetails);
        });
    });

    describe('"commandsWithShortHistory" option', () => {
        it('should be empty array by default', () => {
            assert.deepEqual(parseConfig({}).commandsWithShortHistory, []);
        });

        it('should set from configuration file', () => {
            const config = parseConfig({commandsWithShortHistory: ['foo']});

            assert.deepEqual(config.commandsWithShortHistory, ['foo']);
        });

        describe('should throw an error if value', () => {
            it('is not an array', () => {
                assert.throws(
                    () => parseConfig({commandsWithShortHistory: 100500}),
                    '"commandsWithShortHistory" option must be an array, but got number'
                );
            });

            it('is not an array of strings', () => {
                assert.throws(
                    () => parseConfig({commandsWithShortHistory: [100500]}),
                    '"commandsWithShortHistory" option must be an array of strings but got number for one of items'
                );
            });
        });
    });

    describe('"defaultView" option', () => {
        it('should show all suites by default', () => {
            assert.equal(parseConfig({}).defaultView, ViewMode.ALL);
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

    describe('"diffMode" option', () => {
        it('should show images in column by default', () => {
            assert.equal(parseConfig({}).diffMode, DiffModes.THREE_UP.id);
        });

        it('should set from configuration file', () => {
            const config = parseConfig({diffMode: DiffModes.SWIPE.id});

            assert.equal(config.diffMode, DiffModes.SWIPE.id);
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_diff_mode'] = DiffModes.ONLY_DIFF.id;

            assert.equal(parseConfig({}).diffMode, DiffModes.ONLY_DIFF.id);
        });

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-diff-mode', DiffModes.ONION_SKIN.id);

            assert.equal(parseConfig({}).diffMode, DiffModes.ONION_SKIN.id);
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

    describe('"lazyLoadOffset" option', () => {
        it('should has default value', () => {
            assert.equal(parseConfig({}).lazyLoadOffset, configDefaults.lazyLoadOffset);
        });

        it('should warn about deprecation', () => {
            parseConfig({lazyLoadOffset: 700});

            assert.calledOnceWith(logger.warn, sinon.match('Warning: field "lazyLoadOffset" is deprecated'));
        });
    });

    describe('"errorPatterns", option', () => {
        describe('should throw an error if value', () => {
            it('is not an array', () => {
                assert.throws(
                    () => parseConfig({errorPatterns: 100500}),
                    '"errorPatterns" option must be array, but got number'
                );
            });

            it('is not a string or object', () => {
                assert.throws(
                    () => parseConfig({errorPatterns: [100500]}),
                    'Element of "errorPatterns" option must be plain object or string, but got number'
                );
            });

            it('is object but does not have "name" field', () => {
                assert.throws(
                    () => parseConfig({errorPatterns: [{pattern: 'some-pattern'}]}),
                    'Field "name" in element of "errorPatterns" option must be string, but got undefined'
                );
            });

            it('is object but does not have "pattern" field', () => {
                assert.throws(
                    () => parseConfig({errorPatterns: [{name: 'some-err'}]}),
                    'Field "pattern" in element of "errorPatterns" option must be string, but got undefined'
                );
            });
        });

        it('should have default value', () => {
            assert.deepEqual(parseConfig({}).errorPatterns, configDefaults.errorPatterns);
        });

        it('should modify string to object', () => {
            const config = parseConfig({errorPatterns: ['some-err']});

            assert.deepEqual(config.errorPatterns[0], {name: 'some-err', pattern: 'some-err'});
        });

        it('should set object', () => {
            const config = parseConfig({errorPatterns: [{name: 'some-err', pattern: 'some-pattern'}]});

            assert.deepEqual(
                config.errorPatterns[0],
                {name: 'some-err', pattern: 'some-pattern'}
            );
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

    describe('customGui', () => {
        const mkCustomGuiConfig = (sectionGroupValue) => parseConfig({
            customGui: {'section': [sectionGroupValue]}
        });

        it('should be empty by default', () => {
            assert.isTrue(isEmpty(parseConfig({}).customGui));
        });

        it('should be set from configuration file', () => {
            const initialize = () => {};
            const action = () => {};

            const config = mkCustomGuiConfig({
                type: 'button',
                controls: [{label: 'foo', value: 'bar'}],
                initialize,
                action
            });

            assert.deepEqual(config.customGui, {
                'section': [{
                    type: 'button',
                    controls: [{label: 'foo', value: 'bar'}],
                    initialize,
                    action
                }]
            });
        });

        it('should validate it is plain object', () => assert.throws(
            () => parseConfig({customGui: 'some-gui'}),
            /"customGui" option must be plain object, but got string/
        ));

        describe('section should validate it is', () => {
            it('array', () => assert.throws(
                () => parseConfig({customGui: {'section': 'foo'}}),
                /customGui\["section"\] must be an array, but got string/
            ));

            it('array of plain objects', () => assert.throws(
                () => parseConfig({customGui: {'section': ['foo']}}),
                /customGui\["section"\]\[0\] must be plain object, but got string/
            ));
        });

        describe('section-array object should validate it contains', () => {
            it('field "type"', () => assert.throws(
                () => mkCustomGuiConfig({}), /must contain field "type"/
            ));

            it('string in the field "type"', () => assert.throws(
                () => mkCustomGuiConfig({type: 100500}), /must contain string in the field "type"/
            ));

            it('only supported control in the field "type"', () => assert.throws(
                () => mkCustomGuiConfig({type: 'foo'}),
                new RegExp(`can contain in the field "type" only ${SUPPORTED_CONTROL_TYPES.join(', ')}`)
            ));

            it('field "controls"', () => assert.throws(
                () => mkCustomGuiConfig({type: 'button'}), /must contain field "controls"/
            ));

            it('array in the field "controls"', () => assert.throws(
                () => mkCustomGuiConfig({type: 'button', controls: 'foo'}),
                /must contain array in the field "controls"/
            ));

            it('non-empty array in the field "controls"', () => assert.throws(
                () => mkCustomGuiConfig({type: 'button', controls: []}),
                /must contain non-empty array in the field "controls"/
            ));

            it('array of plain objects in the field "controls"', () => assert.throws(
                () => mkCustomGuiConfig({type: 'button', controls: ['foo', 'bar']}),
                /must contain objects in the array "controls"/
            ));
        });
    });

    describe('customScripts', () => {
        it('should have default value', () => {
            assert.deepEqual(parseConfig({}).customScripts, configDefaults.customScripts);
        });

        it('should validate for Array type', () => {
            assert.throws(
                () => parseConfig({customScripts: 'foo'}),
                /"customScripts" option must be an array, but got string/
            );
        });

        it('should validate for Array items', () => {
            assert.throws(
                () => parseConfig({customScripts: ['foo']}),
                /"customScripts" option must be an array of functions but got string for one of items/
            );
        });

        it('should not throw with correct values', () => {
            const scripts = [function() {}];

            const config = parseConfig({customScripts: scripts});

            assert.deepEqual(config.customScripts, scripts);
        });
    });

    describe('yandexMetrika', () => {
        afterEach(() => {
            sinon.sandbox.restore();
        });

        describe('"enabled" option', () => {
            it('should be enabled by default', () => {
                assert.deepEqual(parseConfig({}).yandexMetrika.enabled, true);
            });

            it('should set value from config file', () => {
                const config = parseConfig({
                    yandexMetrika: {
                        enabled: false
                    }
                });

                assert.equal(config.yandexMetrika.enabled, false);
            });

            it('should respect NO_ANALYTICS env', () => {
                process.env['NO_ANALYTICS'] = 'true';
                const config = parseConfig({});

                assert.equal(config.yandexMetrika.enabled, false);
            });
        });

        describe('counterNumber', () => {
            it('should\'nt have default value', () => {
                assert.deepEqual(parseConfig({}).yandexMetrika.counterNumber, null);
            });

            it('should ignore any value passed by user', () => {
                const config = parseConfig({
                    yandexMetrika: {
                        counterNumber: 100500
                    }
                });

                assert.equal(config.yandexMetrika.counterNumber, null);
            });

            it('should write deprecation warning', () => {
                sinon.sandbox.stub(console, 'warn');
                parseConfig({
                    yandexMetrika: {
                        counterNumber: 100500
                    }
                });

                assert.calledOnceWith(console.warn, sinon.match('"yandexMetrika.counterNumber" option is deprecated'));
            });
        });
    });

    describe('"pluginsEnabled" option', () => {
        it('should be false by default', () => {
            assert.isFalse(parseConfig({}).pluginsEnabled);
        });

        it('should set from configuration file', () => {
            const config = parseConfig({pluginsEnabled: true});

            assert.isTrue(config.pluginsEnabled);
        });

        it('should set from environment variable', () => {
            process.env['html_reporter_plugins_enabled'] = 'true';

            assert.isTrue(parseConfig({}).pluginsEnabled);
        });

        it('should set from cli', () => {
            process.argv = process.argv.concat('--html-reporter-plugins-enabled', 'true');

            assert.isTrue(parseConfig({}).pluginsEnabled);
        });
    });

    describe('plugins', () => {
        it('should have default value', () => {
            assert.deepEqual(parseConfig({}).plugins, configDefaults.plugins);
            assert.deepEqual(parseConfig({}).plugins, []);
        });

        it('should validate for Array type', () => {
            assert.throws(
                () => parseConfig({plugins: 'foo'}),
                /"plugins" option must be an array, but got string/
            );
        });

        it('should validate for Array items', () => {
            assert.throws(
                () => parseConfig({plugins: ['foo']}),
                /plugin description expected to be an object but got string/
            );
        });

        it('should validate for Array item required fields', () => {
            assert.throws(
                () => parseConfig({plugins: [{name: 'test-plugin'}]}),
                /"plugins.component" option must be non-empty string but got undefined/
            );
        });

        it('should validate for Array item point field when present', () => {
            assert.throws(
                () => parseConfig({plugins: [{name: 'test-plugin', component: 'TestComponent', point: 10}]}),
                /"plugins.point" option must be string but got number/
            );
        });

        it('should validate for Array item point field when present', () => {
            assert.throws(
                () => parseConfig({plugins: [
                    {name: 'test-plugin', component: 'TestComponent', point: 'result', position: 'red'}
                ]}),
                /"plugins.position" option got an unexpected value "red"/
            );
        });

        it('should validate for Array item unexpected fields', () => {
            assert.throws(
                () => parseConfig({plugins: [
                    {name: 'test-plugin', component: 'TestComponent', unexpected: 'field'}
                ]}),
                /a "plugins" item has unexpected field "unexpected" of type string/
            );
        });

        it('should not throw with correct values', () => {
            const plugins = [
                {
                    name: 'test-plugin',
                    component: 'TestComponent',
                    point: 'result',
                    position: 'wrap'
                }
            ];

            const config = parseConfig({plugins: plugins});

            assert.deepEqual(config.plugins, plugins);
        });

        it('should set from environment variable', () => {
            const plugins = [
                {
                    name: 'test-plugin',
                    component: 'TestComponent',
                    point: 'result',
                    position: 'wrap'
                }
            ];

            process.env['html_reporter_plugins'] = JSON.stringify(plugins);

            assert.deepEqual(parseConfig({}).plugins, plugins);
        });

        it('should set from cli', () => {
            const plugins = [
                {
                    name: 'test-plugin',
                    component: 'TestComponent',
                    point: 'result',
                    position: 'wrap'
                }
            ];

            process.argv = process.argv.concat('--html-reporter-plugins', JSON.stringify(plugins));

            assert.deepEqual(parseConfig({}).plugins, plugins);
        });
    });
});
