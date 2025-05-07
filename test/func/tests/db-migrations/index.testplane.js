const childProcess = require('child_process');
const path = require('path');
const treeKill = require('tree-kill');
const {PORTS} = require('../../utils/constants');
const {runGui, getTestSectionByNameSelector} = require('../utils');

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';

const projectName = process.env.PROJECT_UNDER_TEST;
const projectDir = path.resolve(__dirname, '../../fixtures', projectName);
const guiUrl = `http://${serverHost}:${PORTS[projectName].gui}`;

const reportDir = path.join(projectDir, 'report');

describe('Backwards compatibility with old sqlite formats', () => {
    let guiProcess;

    beforeEach(async ({browser}) => {
        guiProcess = await runGui(projectDir);

        await browser.url(guiUrl);
    });

    afterEach(async () => {
        await treeKill(guiProcess.pid);

        childProcess.execSync('git checkout .', {cwd: reportDir});
    });

    // It's sufficient to check only v0, because that means all newer versions are also supported
    // through a chain of migrations v0 -> v1 -> ...
    it('should be able to open report with sqlite.db v0', async ({browser}) => {
        const testSection = await browser.$(getTestSectionByNameSelector('failed test with ansi markup'));
        await testSection.assertView('section', {screenshotDelay: 1000});
    });
});
