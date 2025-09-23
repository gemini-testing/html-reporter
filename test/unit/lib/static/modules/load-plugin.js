'use strict';

const axios = require('axios');
const {loadPlugin} = require('lib/static/modules/load-plugin');
const actionNames = require('lib/static/modules/action-names').default;
const actions = require('lib/static/modules/actions');
const selectors = require('lib/static/modules/selectors');
const {getPluginMiddlewareRoute} = require('lib/static/modules/utils/pluginMiddlewareRoute');

describe('static/modules/load-plugin', () => {
    const sandbox = sinon.sandbox.create();
    let plugin;
    let pluginFactory;

    beforeEach(() => {
        plugin = sinon.stub();
        pluginFactory = [plugin];
        global.pluginFactory = pluginFactory;

        sandbox.stub(axios, 'get');
        axios.get.resolves({
            status: 200,
            data: `__testplane_html_reporter_register_plugin__(pluginFactory)`
        });
    });

    afterEach(() => {
        sandbox.restore();
        delete global.pluginFactory;
    });

    describe('loadPlugin', () => {
        it('should call plugin constructor with plugin name', async () => {
            await loadPlugin('plugin-a');

            assert.deepStrictEqual(plugin.args, [
                [{
                    actions,
                    actionNames,
                    selectors,
                    pluginName: 'plugin-a',
                    pluginConfig: undefined,
                    pluginServerEndpointPrefix: getPluginMiddlewareRoute('plugin-a')
                }]
            ]);
        });

        it('should call plugin constructor with plugin config', async () => {
            const config = {param: 'value'};
            await loadPlugin('plugin-b', config);

            assert.deepStrictEqual(plugin.args, [
                [{
                    actions,
                    actionNames,
                    selectors,
                    pluginName: 'plugin-b',
                    pluginConfig: config,
                    pluginServerEndpointPrefix: getPluginMiddlewareRoute('plugin-b')
                }]
            ]);
        });

        it('should call plugin constructor with plugin dependencies', async () => {
            pluginFactory.unshift('axios');
            await loadPlugin('plugin-c');

            assert.deepStrictEqual(plugin.args, [
                [axios, {
                    actions,
                    actionNames,
                    selectors,
                    pluginName: 'plugin-c',
                    pluginConfig: undefined,
                    pluginServerEndpointPrefix: getPluginMiddlewareRoute('plugin-c')
                }]
            ]);
        });

        it('should skip denied plugin dependencies', async () => {
            pluginFactory.unshift('dependency');
            await loadPlugin('plugin-d');

            assert.deepStrictEqual(plugin.args, [
                [undefined, {
                    actions,
                    actionNames,
                    selectors,
                    pluginName: 'plugin-d',
                    pluginConfig: undefined,
                    pluginServerEndpointPrefix: getPluginMiddlewareRoute('plugin-d')
                }]
            ]);
        });
    });
});
