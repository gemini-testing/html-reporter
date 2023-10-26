const childProcess = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const treeKill = require('tree-kill');

const {PORTS} = require('../../utils/constants');
const {hideScreenshots, runGui, waitForFsChanges, getFsDiffFromVcs} = require('../utils');

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';

const projectName = process.env.PROJECT_UNDER_TEST;
const projectDir = path.resolve(__dirname, '../../fixtures', projectName);
const guiUrl = `http://${serverHost}:${PORTS[projectName].gui}`;

const reportDir = path.join(projectDir, 'report');
const reportBackupDir = path.join(projectDir, 'report-backup');
const screensDir = path.join(projectDir, 'screens');

// These tests should not be launched in parallel
describe('Tinder mode', () => {
    let guiProcess;

    beforeEach(async ({browser}) => {
        await fs.cp(reportDir, reportBackupDir, {recursive: true});

        guiProcess = await runGui();

        await browser.url(guiUrl);
        await browser.$('button*=Expand all').click();

        await browser.$('button*=Switch accept mode').click();
    });

    afterEach(async () => {
        await treeKill(guiProcess.pid);

        await fs.rm(reportDir, {recursive: true, force: true, maxRetries: 3});
        await fs.rename(reportBackupDir, reportDir);

        childProcess.execSync('git restore .', {cwd: screensDir});
        childProcess.execSync('git clean -dfx .', {cwd: screensDir});
    });

    describe(`accepting screenshot`, () => {
        beforeEach(async ({browser}) => {
            const testFullName = await browser.$('span[data-test-id="screenshot-accepter-test-name"]').getText();

            const acceptButton = await browser.$('button[data-test-id="screenshot-accepter-accept"]');
            await acceptButton.click();

            await browser.waitUntil(async () => {
                const progress = await browser.$('span[data-test-id="screenshot-accepter-progress-bar"]').getAttribute('data-content');

                return progress === '1/2';
            }, {interval: 100});

            const switchAcceptModeButton = await browser.$('button[data-test-id="screenshot-accepter-switch-accept-mode"]');
            await switchAcceptModeButton.click();

            const testNameFilterInput = await browser.$('input[data-test-id="header-test-name-filter"]');

            await testNameFilterInput.setValue(testFullName);
            await browser.$('div[data-test-id="header-strict-match"]').click();

            await waitForFsChanges(screensDir);
        });

        it('should create a successful retry', async ({browser}) => {
            const retrySwitcher = await browser.$(`(//button[@data-test-id="retry-switcher"])[last()]`);
            await hideScreenshots(browser);

            await retrySwitcher.assertView('retry-switcher');
        });

        it('should make the test pass on next run', async ({browser}) => {
            const retryButton = await browser.$('button[data-test-id="test-retry"]');

            // TODO: find a correct sign to wait for. Issue is that retry button is totally clickable, but doesn't
            //       work right away after switch accept mode and applying filtering for some reason.
            await browser.pause(500);
            await retryButton.click();

            await retryButton.waitForClickable({reverse: true, timeout: 10000});
            await retryButton.waitForClickable({timeout: 10000});

            const retrySwitcher = await browser.$(`(//button[@data-test-id="retry-switcher"])[last()]`);
            await hideScreenshots(browser);

            await retrySwitcher.assertView('retry-switcher');
        });
    });

    describe(`undo accepting screenshot`, () => {
        it('should leave project files intact', async ({browser}) => {
            const acceptButton = await browser.$('button[data-test-id="screenshot-accepter-accept"]');
            await acceptButton.click();

            await browser.waitUntil(async () => {
                const progress = await browser.$('span[data-test-id="screenshot-accepter-progress-bar"]').getAttribute('data-content');

                return progress === '1/2';
            }, {interval: 100});

            await waitForFsChanges(screensDir);
            const fsDiffBeforeUndo = getFsDiffFromVcs(screensDir);

            const undoButton = await browser.$('button[data-test-id="screenshot-accepter-undo"]');
            await undoButton.click();

            await waitForFsChanges(screensDir, (output) => output.length === 0);

            const fsDiffAfterUndo = getFsDiffFromVcs(screensDir);

            expect(fsDiffBeforeUndo.length > 0).toBeTruthy();
            expect(fsDiffAfterUndo.length === 0).toBeTruthy();
        });
    });

    it('should show success screen after accepting all screenshots', async ({browser}) => {
        const acceptButton = await browser.$('button[data-test-id="screenshot-accepter-accept"]');

        for (let i = 1; i <= 2; i++) {
            await acceptButton.click();

            await browser.waitUntil(async () => {
                const progress = await browser.$('span[data-test-id="screenshot-accepter-progress-bar"]').getAttribute('data-content');

                return progress === `${i}/2`;
            }, {interval: 100});
        }

        await expect(await browser.$('div*=All screenshots are accepted')).toBeDisplayed();
    });
});
