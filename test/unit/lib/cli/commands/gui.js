'use strict';

const {Command} = require('@gemini-testing/commander');
const proxyquire = require('proxyquire');
const registerGui = proxyquire('lib/cli/commands/gui', {'../../gui': {default: () => {}}});

describe('gui command', () => {
    it('should parse the requested port as a number', () => {
        const cli = new Command();
        registerGui(cli, {initGuiApi: sinon.stub()});
        const gui = cli.commands[0];

        cli.parse(['node', 'testplane', 'gui', '--port', '3000']);

        assert.strictEqual(gui.port, 3000);
    });
});
