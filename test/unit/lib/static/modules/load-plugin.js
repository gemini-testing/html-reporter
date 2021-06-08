'use strict';

import axios from 'axios';
import loadPlugin from 'lib/static/modules/load-plugin';
import * as actions from 'lib/static/modules/actions';

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
            data: `__hermione_html_reporter_register_plugin__(pluginFactory)`
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
                [{actions, pluginName: 'plugin-a', pluginConfig: undefined}]
            ]);
        });

        it('should call plugin constructor with plugin config', async () => {
            const config = {param: 'value'};
            await loadPlugin('plugin-b', config);

            assert.deepStrictEqual(plugin.args, [
                [{actions, pluginName: 'plugin-b', pluginConfig: config}]
            ]);
        });

        it('should call plugin constructor with plugin dependencies', async () => {
            pluginFactory.unshift('axios');
            await loadPlugin('plugin-c');

            assert.deepStrictEqual(plugin.args, [
                [axios, {actions, pluginName: 'plugin-c', pluginConfig: undefined}]
            ]);
        });

        it('should skip denied plugin dependencies', async () => {
            pluginFactory.unshift('dependency');
            await loadPlugin('plugin-d');

            assert.deepStrictEqual(plugin.args, [
                [undefined, {actions, pluginName: 'plugin-d', pluginConfig: undefined}]
            ]);
        });
    });
});
