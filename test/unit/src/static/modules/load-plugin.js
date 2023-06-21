'use strict';

import axios from 'axios';
import loadPlugin from 'src/static/modules/load-plugin';
import actionNames from 'src/static/modules/action-names';
import * as actions from 'src/static/modules/actions';
import * as selectors from 'src/static/modules/selectors';

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
                [{actions, actionNames, selectors, pluginName: 'plugin-a', pluginConfig: undefined}]
            ]);
        });

        it('should call plugin constructor with plugin config', async () => {
            const config = {param: 'value'};
            await loadPlugin('plugin-b', config);

            assert.deepStrictEqual(plugin.args, [
                [{actions, actionNames, selectors, pluginName: 'plugin-b', pluginConfig: config}]
            ]);
        });

        it('should call plugin constructor with plugin dependencies', async () => {
            pluginFactory.unshift('axios');
            await loadPlugin('plugin-c');

            assert.deepStrictEqual(plugin.args, [
                [axios, {actions, actionNames, selectors, pluginName: 'plugin-c', pluginConfig: undefined}]
            ]);
        });

        it('should skip denied plugin dependencies', async () => {
            pluginFactory.unshift('dependency');
            await loadPlugin('plugin-d');

            assert.deepStrictEqual(plugin.args, [
                [undefined, {actions, actionNames, selectors, pluginName: 'plugin-d', pluginConfig: undefined}]
            ]);
        });
    });
});
