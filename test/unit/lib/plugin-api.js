'use strict';

const PluginApi = require('lib/plugin-api');
const PluginEvents = require('lib/constants/plugin-events');

describe('plugin api', () => {
    it('should store extra items', () => {
        const pluginApi = PluginApi.create();

        pluginApi.addExtraItem('some', 'item');

        assert.deepEqual(pluginApi.values.extraItems, {some: 'item'});
    });

    it('should store meta info extenders', () => {
        const pluginApi = PluginApi.create();

        pluginApi.addMetaInfoExtender('name', 'value');

        assert.deepEqual(pluginApi.values.metaInfoExtenders, {name: 'value'});
    });

    it('should return all stored values', () => {
        const pluginApi = PluginApi.create();

        pluginApi.addExtraItem('key1', 'value1');
        pluginApi.addMetaInfoExtender('key2', 'value2');
        pluginApi.imagesSaver = {some: 'images_saver'};
        pluginApi.reportsSaver = {some: 'reports_saver'};

        assert.deepEqual(pluginApi.values, {
            extraItems: {key1: 'value1'},
            metaInfoExtenders: {key2: 'value2'},
            imagesSaver: {some: 'images_saver'},
            reportsSaver: {some: 'reports_saver'}
        });
    });

    describe('should provide access to', () => {
        it('plugin events', () => {
            const pluginApi = PluginApi.create();

            assert.deepEqual(pluginApi.events, PluginEvents);
        });
    });
});
