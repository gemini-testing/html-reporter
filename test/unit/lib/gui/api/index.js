'use strict';

const EventEmitter2 = require('eventemitter2');
const {GuiEvents} = require('lib/gui/constants/gui-events');
const {GuiApi} = require('lib/gui/api');

describe('lib/gui/api', () => {
    describe('constructor', () => {
        it('should init gui api', () => {
            const api = GuiApi.create();

            assert.instanceOf(api.gui, EventEmitter2);
        });

        it('should add events to gui api', () => {
            const api = GuiApi.create();

            assert.deepEqual(api.gui.events, GuiEvents);
        });
    });

    describe('initServer', () => {
        it('should emit "SERVER_INIT" event through gui api', () => {
            const api = GuiApi.create();
            const onServerInit = sinon.spy().named('onServerInit');
            api.gui.on(GuiEvents.SERVER_INIT, onServerInit);

            api.initServer({foo: 'bar'});

            assert.calledOnceWith(onServerInit, {foo: 'bar'});
        });
    });

    describe('serverReady', () => {
        it('should emit "SERVER_READY" event through gui api', () => {
            const api = GuiApi.create();
            const onServerReady = sinon.spy().named('onServerReady');
            api.gui.on(GuiEvents.SERVER_READY, onServerReady);

            api.serverReady({url: 'http://my.server'});

            assert.calledOnceWith(onServerReady, {url: 'http://my.server'});
        });
    });
});
