'use strict';
var EventEmitter = require('events').EventEmitter;
var guiEvents = require('lib/gui/constants/gui-events');
var Api = require('lib/gui/api');
var stubTool = require('../../../utils').stubTool;
describe('lig/gui/api', function () {
    describe('constructor', function () {
        it('should extend tool with gui api', function () {
            var tool = stubTool();
            Api.create(tool);
            assert.instanceOf(tool.gui, EventEmitter);
        });
        it('should add events to gui api', function () {
            var tool = stubTool();
            Api.create(tool);
            assert.deepEqual(tool.gui.events, guiEvents);
        });
    });
    describe('initServer', function () {
        it('should emit "SERVER_INIT" event through gui api', function () {
            var tool = stubTool();
            var api = Api.create(tool);
            var onServerInit = sinon.spy().named('onServerInit');
            tool.gui.on(guiEvents.SERVER_INIT, onServerInit);
            api.initServer({ foo: 'bar' });
            assert.calledOnceWith(onServerInit, { foo: 'bar' });
        });
    });
});
//# sourceMappingURL=index.js.map