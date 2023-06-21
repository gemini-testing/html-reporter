'use strict';

const proxyquire = require('proxyquire');

describe('static/modules/plugins', () => {
    const sandbox = sinon.sandbox.create();
    let plugins;
    let loadPluginStub;

    beforeEach(() => {
        loadPluginStub = sandbox.stub();
        plugins = proxyquire('src/static/modules/plugins', {
            './load-plugin': {default: loadPluginStub}
        });
    });

    afterEach(() => sandbox.restore());

    describe('loadAll', () => {
        it('should call loadPlugin function with configuration', async () => {
            const config = {param: 'value'};

            await plugins.loadAll({
                pluginsEnabled: true,
                plugins: [
                    {name: 'plugin-a'},
                    {name: 'plugin-b', config}
                ]
            });

            assert.deepStrictEqual(loadPluginStub.args, [
                ['plugin-a', undefined],
                ['plugin-b', config]
            ]);
        });
    });

    describe('getLoadedConfigs', () => {
        it('should return empty array when no plugins are configured', async () => {
            await plugins.loadAll();

            const result = plugins.getLoadedConfigs();

            assert.deepStrictEqual(result, []);
        });

        it('should return empty array when plugins are enabled but not defined', async () => {
            await plugins.loadAll({pluginsEnabled: true});

            const result = plugins.getLoadedConfigs();

            assert.deepStrictEqual(result, []);
        });

        it('should return empty array when plugins are disabled', async () => {
            loadPluginStub.resolves({});
            await plugins.loadAll({
                pluginsEnabled: false,
                plugins: [
                    {name: 'plugin-a'},
                    {name: 'plugin-b'},
                    {name: 'plugin-c'},
                    {name: 'plugin-a'},
                    {name: 'plugin-b'}
                ]
            });

            const result = plugins.getLoadedConfigs();

            assert.deepStrictEqual(result, []);
        });

        it('should return all the config items when all the plugins are loaded', async () => {
            loadPluginStub.resolves({});
            await plugins.loadAll({
                pluginsEnabled: true,
                plugins: [
                    {name: 'plugin-a'},
                    {name: 'plugin-b'},
                    {name: 'plugin-c'},
                    {name: 'plugin-a'},
                    {name: 'plugin-b'}
                ]
            });

            const result = plugins.getLoadedConfigs();

            assert.deepStrictEqual(result, [
                {name: 'plugin-a'},
                {name: 'plugin-b'},
                {name: 'plugin-c'},
                {name: 'plugin-a'},
                {name: 'plugin-b'}
            ]);
        });

        it('should return only loaded plugin configs', async () => {
            loadPluginStub.callsFake(async (pluginName) => {
                return pluginName === 'plugin-b' ? null : {};
            });
            await plugins.loadAll({
                pluginsEnabled: true,
                plugins: [
                    {name: 'plugin-a'},
                    {name: 'plugin-b'},
                    {name: 'plugin-c'},
                    {name: 'plugin-a'},
                    {name: 'plugin-b'},
                    {name: 'plugin-c'}
                ]
            });

            const result = plugins.getLoadedConfigs();

            assert.deepStrictEqual(result, [
                {name: 'plugin-a'},
                {name: 'plugin-c'},
                {name: 'plugin-a'},
                {name: 'plugin-c'}
            ]);
        });
    });

    describe('get', () => {
        it('should throw when requested plugin is not loaded', async () => {
            await plugins.loadAll();

            assert.throws(() => plugins.get('plugin-x', 'TestComponent'), 'Plugin "plugin-x" is not loaded.');
        });

        it('should throw when specified plugin component does not exist', async () => {
            loadPluginStub.resolves({});
            await plugins.loadAll({pluginsEnabled: true, plugins: [{name: 'plugin-a'}]});

            assert.throws(() => plugins.get('plugin-a', 'TestComponent'), '"TestComponent" is not defined on plugin "plugin-a".');
        });

        it('should return requested component when plugin is loaded', async () => {
            const TestComponent = {};
            loadPluginStub.resolves({TestComponent});
            await plugins.loadAll({pluginsEnabled: true, plugins: [{name: 'plugin-a'}]});

            const result = plugins.get('plugin-a', 'TestComponent');

            assert.strictEqual(result, TestComponent);
        });
    });

    describe('forEach', () => {
        let callbackStub;

        beforeEach(() => {
            callbackStub = sandbox.stub();
        });

        it('should not call the callback when no plugins are loaded', async () => {
            await plugins.loadAll();

            plugins.forEach(callbackStub);

            assert.notCalled(callbackStub);
        });

        it('should not call the callback when plugins are enabled but not defined', async () => {
            await plugins.loadAll({pluginsEnabled: true});

            plugins.forEach(callbackStub);

            assert.notCalled(callbackStub);
        });

        it('should not call the callback when plugins are disabled', async () => {
            loadPluginStub.resolves({});
            await plugins.loadAll({
                pluginsEnabled: false,
                plugins: [
                    {name: 'plugin-a'},
                    {name: 'plugin-b'},
                    {name: 'plugin-c'},
                    {name: 'plugin-a'},
                    {name: 'plugin-b'}
                ]
            });

            plugins.forEach(callbackStub);

            assert.notCalled(callbackStub);
        });

        it('should call the callback with unique plugin names from only loaded plugins', async () => {
            const pluginsToLoad = {
                'plugin-a': {AComponent: {}},
                'plugin-b': null,
                'plugin-c': {CComponent: {}}
            };
            loadPluginStub.callsFake(async (pluginName) => {
                return pluginsToLoad[pluginName];
            });
            await plugins.loadAll({
                pluginsEnabled: true,
                plugins: [
                    {name: 'plugin-a'},
                    {name: 'plugin-b'},
                    {name: 'plugin-c'},
                    {name: 'plugin-a'},
                    {name: 'plugin-b'}
                ]
            });

            plugins.forEach(callbackStub);

            assert.deepStrictEqual(callbackStub.args, [
                [pluginsToLoad['plugin-a'], 'plugin-a'],
                [pluginsToLoad['plugin-c'], 'plugin-c']
            ]);
        });
    });
});
