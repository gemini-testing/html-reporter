'use strict';

const {EventEmitter} = require('events');
const {Command} = require('@gemini-testing/commander');
const registerGui = require('lib/cli/commands/gui');
const {listenWithFallback} = require('lib/gui/listen-with-fallback');

describe('lib/cli/commands/gui', () => {
    it('should use the next port when the port passed via --port is busy', async () => {
        const cli = new Command();
        registerGui(cli, {initGuiApi: sinon.stub()});
        const [gui] = cli.commands;
        gui.parseOptions(['--port', '8081']);

        const listener = new EventEmitter();
        const listen = sinon.stub().callsArgAsync(2).returns(listener);
        listen.onFirstCall().callsFake(() => {
            process.nextTick(() => listener.emit('error', {code: 'EADDRINUSE'}));
            return listener;
        });

        const {actualPort} = await listenWithFallback({server: {listen}, hostname: '127.0.0.1', requestedPort: gui.port});

        assert.strictEqual(actualPort, 8082);
    });
});
