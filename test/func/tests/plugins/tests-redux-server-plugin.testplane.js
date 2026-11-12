const path = require('path');
const {promisify} = require('util');
const treeKill = promisify(require('tree-kill'));
const {runGui} = require('../utils');

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';

describe('Test server-backed redux plugin', () => {
    let guiProcess;

    beforeEach(async ({browser}) => {
        guiProcess = await runGui(path.resolve(__dirname, '../../fixtures/plugins'));
        await browser.url(`http://${serverHost}:8002`);
        await browser.$('//*[contains(@class, "expand-dropdown")]//button').click();
        await browser.$('//*[contains(@class, "expand-popup")]//span[contains(normalize-space(), "All")]').click();
    });

    afterEach(async () => {
        if (guiProcess) {
            await treeKill(guiProcess.pid);
            guiProcess = null;
        }
    });

    it('should update plugin state through a thunk and server middleware', async ({browser}) => {
        const border = await browser.$('.redux-server-border');
        await border.waitForDisplayed();
        assert.include(await border.getAttribute('class'), 'red-border');
        assert.equal(await border.getText(), '0');

        await border.click();

        await browser.waitUntil(async () => (await border.getAttribute('class')).includes('green-border'));
        assert.equal(await border.getText(), '1');
    });
});
