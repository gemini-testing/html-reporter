'use strict';

const {HtmlReporter} = require('lib/plugin-api');
const {PluginEvents} = require('lib/constants/plugin-events');
const {ToolName} = require('lib/constants');

describe('plugin api', () => {
    it('should store extra items', () => {
        const pluginApi = HtmlReporter.create();

        pluginApi.addExtraItem('some', 'item');

        assert.deepEqual(pluginApi.values.extraItems, {some: 'item'});
    });

    it('should store meta info extenders', () => {
        const pluginApi = HtmlReporter.create();

        pluginApi.addMetaInfoExtender('name', 'value');

        assert.deepEqual(pluginApi.values.metaInfoExtenders, {name: 'value'});
    });

    it('should return all stored values', () => {
        const pluginApi = HtmlReporter.create();

        pluginApi.addExtraItem('key1', 'value1');
        pluginApi.addMetaInfoExtender('key2', 'value2');
        pluginApi.imagesSaver = {some: 'images_saver'};
        pluginApi.reportsSaver = {some: 'reports_saver'};

        assert.deepEqual(pluginApi.values, {
            toolName: ToolName.Testplane,
            extraItems: {key1: 'value1'},
            metaInfoExtenders: {key2: 'value2'},
            imagesSaver: {some: 'images_saver'},
            reportsSaver: {some: 'reports_saver'}
        });
    });

    describe('should provide access to', () => {
        it('plugin events', () => {
            const pluginApi = HtmlReporter.create();

            assert.deepEqual(pluginApi.events, PluginEvents);
        });

        it('plugin config', () => {
            const pluginConfig = {path: 'some-path'};
            const pluginApi = HtmlReporter.create(pluginConfig);

            assert.deepEqual(pluginApi.config, pluginConfig);
        });
    });
});
