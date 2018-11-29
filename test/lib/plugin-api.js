'use strict';

const PluginApi = require('lib/plugin-api');

describe('plugin api', () => {
    it('should store extra items', () => {
        const pluginApi = new PluginApi();

        pluginApi.addExtraItem('some', 'item');

        assert.deepEqual(pluginApi.extraItems, {some: 'item'});
    });
});
