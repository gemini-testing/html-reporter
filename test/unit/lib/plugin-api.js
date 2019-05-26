'use strict';

const PluginApi = require('lib/plugin-api');

describe('plugin api', () => {
    it('should store extra items', () => {
        const pluginApi = new PluginApi();

        pluginApi.addExtraItem('some', 'item');

        assert.deepEqual(pluginApi.values.extraItems, {some: 'item'});
    });

    it('should store meta info extenders', () => {
        const pluginApi = new PluginApi();

        pluginApi.addMetaInfoExtender('name', 'value');

        assert.deepEqual(pluginApi.values.metaInfoExtenders, {name: 'value'});
    });

    it('should return all stored values', () => {
        const pluginApi = new PluginApi();

        pluginApi.addExtraItem('key1', 'value1');
        pluginApi.addMetaInfoExtender('key2', 'value2');

        assert.deepEqual(pluginApi.values, {
            extraItems: {key1: 'value1'},
            metaInfoExtenders: {key2: 'value2'}
        });
    });
});
