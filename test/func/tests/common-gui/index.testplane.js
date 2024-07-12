const childProcess = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const {promisify} = require('util');

const treeKill = promisify(require('tree-kill'));

const {PORTS} = require('../../utils/constants');
const {
    getTestSectionByNameSelector,
    getSpoilerByNameSelector,
    getElementWithTextSelector,
    hideScreenshots,
    runGui,
    waitForFsChanges,
    getFsDiffFromVcs
} = require('../utils');

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';

const projectName = process.env.PROJECT_UNDER_TEST;
const projectDir = path.resolve(__dirname, '../../fixtures', projectName);
const guiUrl = `http://${serverHost}:${PORTS[projectName].gui}`;

const reportDir = path.join(projectDir, 'report');
const reportBackupDir = path.join(projectDir, 'report-backup');
const screensDir = path.join(projectDir, 'screens');

// These tests should not be launched in parallel
describe('GUI mode', () => {
    let guiProcess;

    beforeEach(async ({browser}) => {
        await fs.cp(reportDir, reportBackupDir, {recursive: true});

        guiProcess = await runGui(projectDir);

        await browser.url(guiUrl);
        await browser.$('//*[contains(@class, "expand-dropdown")]//button').click();
        await browser.$('//*[contains(@class, "expand-popup")]//span[contains(normalize-space(), "All")]').click();
    });

    afterEach(async () => {
        await treeKill(guiProcess.pid);

        await fs.rm(reportDir, {recursive: true, force: true, maxRetries: 3});
        await fs.rename(reportBackupDir, reportDir);

        childProcess.execSync('git restore .', {cwd: screensDir});
        childProcess.execSync('git clean -dfx .', {cwd: screensDir});
    });

    describe('running tests', () => {
        it('should run a single test', async ({browser}) => {
            const retryButton = await browser.$(
                getTestSectionByNameSelector('successful test') +
                '//button[contains(normalize-space(), "Retry")]'
            );

            await retryButton.click();
            await retryButton.waitForClickable({timeout: 10000});

            // Should be passed
            const testSection = await browser.$(getTestSectionByNameSelector('successful test'));
            const testSectionClassNames = (await testSection.getAttribute('class')).split(' ');

            expect(testSectionClassNames).toContain('section_status_success');

            // History should appear
            const historySelector = getTestSectionByNameSelector('successful test') + '//' + getSpoilerByNameSelector('History');

            await browser.$(historySelector).click();
            const historyText = await browser.$(historySelector + '/div').getText();

            expect(historyText.includes('<-')).toBeTruthy();
        });
    });

    for (const testName of ['image comparison diff', 'no reference image']) {
        const fullTestName = `test with ${testName}`;
        describe(`accepting ${fullTestName}`, () => {
            beforeEach(async ({browser}) => {
                await browser.$(getTestSectionByNameSelector(fullTestName)).scrollIntoView();

                const acceptButton = await browser.$(
                    getTestSectionByNameSelector(fullTestName) +
                    '//button[contains(normalize-space(), "Accept")]'
                );

                await acceptButton.click();

                await waitForFsChanges(screensDir);
            });

            it('should create a successful retry', async ({browser}) => {
                const allRetryButtonsSelector =
                    getTestSectionByNameSelector(fullTestName) +
                    '//button[@data-test-id="retry-switcher"]';
                const retrySwitcher = browser.$(`(${allRetryButtonsSelector})[last()]`);
                await hideScreenshots(browser);

                await retrySwitcher.assertView('retry-switcher');

                const testSection = await browser.$(getTestSectionByNameSelector(fullTestName));
                const testSectionClassNames = (await testSection.getAttribute('class')).split(' ');

                expect(testSectionClassNames).toContain('section_status_success');
            });

            it('should make the test pass on next run', async ({browser}) => {
                const retryButton = await browser.$(
                    getTestSectionByNameSelector(fullTestName) +
                    getElementWithTextSelector('button', 'Retry')
                );

                await retryButton.click();
                await retryButton.waitForClickable({reverse: true, timeout: 10000});
                await retryButton.waitForClickable({timeout: 10000});

                // Verify green retry button
                const allRetryButtonsSelector =
                    getTestSectionByNameSelector(fullTestName) +
                    '//button[@data-test-id="retry-switcher"]';
                const retrySwitcher = browser.$(`(${allRetryButtonsSelector})[last()]`);
                await hideScreenshots(browser);

                await retrySwitcher.assertView('retry-switcher');

                // Verify green test section
                const testSection = await browser.$(getTestSectionByNameSelector(fullTestName));
                const testSectionClassNames = (await testSection.getAttribute('class')).split(' ');

                expect(testSectionClassNames).toContain('section_status_success');
            });
        });
    }

    for (const testName of ['image comparison diff', 'no reference image']) {
        const fullTestName = `test with ${testName}`;
        describe(`undo accepting ${fullTestName}`, () => {
            beforeEach(async ({browser}) => {
                await browser.$(getTestSectionByNameSelector(fullTestName)).scrollIntoView();

                const acceptButton = await browser.$(
                    getTestSectionByNameSelector(fullTestName) +
                    getElementWithTextSelector('button', 'Accept')
                );

                await acceptButton.click();

                await waitForFsChanges(screensDir);
            });

            it('should leave project files intact', async ({browser}) => {
                const fsDiffBeforeUndo = getFsDiffFromVcs(screensDir);

                const undoButton = await browser.$(
                    getTestSectionByNameSelector(fullTestName) +
                    getElementWithTextSelector('button', 'Undo')
                );

                await undoButton.click();

                await waitForFsChanges(screensDir, (output) => output.length === 0);

                const fsDiffAfterUndo = getFsDiffFromVcs(screensDir);

                expect(fsDiffBeforeUndo.length > 0).toBeTruthy();
                expect(fsDiffAfterUndo.length === 0).toBeTruthy();
            });
        });
    }
});
