'use strict';

const {EventEmitter} = require('events');
const guiEvents = require('lib/gui/constants/gui-events');
const Api = require('lib/gui/api');
const {stubTool} = require('../../../utils');

describe('lig/gui/api', () => {
    describe('constructor', () => {
        it('should extend tool with gui api', () => {
            const tool = stubTool();

            Api.create(tool);

            assert.instanceOf(tool.gui, EventEmitter);
        });

        it('should add events to gui api', () => {
            const tool = stubTool();

            Api.create(tool);

            assert.deepEqual(tool.gui.events, guiEvents);
        });
    });

    describe('initServer', () => {
        it('should emit "SERVER_INIT" event through gui api', () => {
            const tool = stubTool();
            const api = Api.create(tool);
            const onServerInit = sinon.spy().named('onServerInit');
            tool.gui.on(guiEvents.SERVER_INIT, onServerInit);

            api.initServer({foo: 'bar'});

            assert.calledOnceWith(onServerInit, {foo: 'bar'});
        });
    });
});
