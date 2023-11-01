'use strict';

const EventEmitter2 = require('eventemitter2');
const {GuiEvents} = require('lib/gui/constants/gui-events');
const Api = require('lib/gui/api');
const {stubTool} = require('../../../utils');

describe('lig/gui/api', () => {
    describe('constructor', () => {
        it('should extend tool with gui api', () => {
            const tool = stubTool();

            Api.create(tool);

            assert.instanceOf(tool.gui, EventEmitter2);
        });

        it('should add events to gui api', () => {
            const tool = stubTool();

            Api.create(tool);

            assert.deepEqual(tool.gui.events, GuiEvents);
        });
    });

    describe('initServer', () => {
        it('should emit "SERVER_INIT" event through gui api', () => {
            const tool = stubTool();
            const api = Api.create(tool);
            const onServerInit = sinon.spy().named('onServerInit');
            tool.gui.on(GuiEvents.SERVER_INIT, onServerInit);

            api.initServer({foo: 'bar'});

            assert.calledOnceWith(onServerInit, {foo: 'bar'});
        });
    });

    describe('serverReady', () => {
        it('should emit "SERVER_READY" event through gui api', () => {
            const tool = stubTool();
            const api = Api.create(tool);
            const onServerReady = sinon.spy().named('onServerReady');
            tool.gui.on(GuiEvents.SERVER_READY, onServerReady);

            api.serverReady({url: 'http://my.server'});

            assert.calledOnceWith(onServerReady, {url: 'http://my.server'});
        });
    });
});
