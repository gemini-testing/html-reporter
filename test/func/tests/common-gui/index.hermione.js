const childProcess = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const {promisify} = require('util');

const treeKill = promisify(require('tree-kill'));

const {PORTS} = require('../../utils/constants');
const {getTestSectionByName} = require('../utils');

const projectName = process.env.PROJECT_UNDER_TEST;
const projectDir = path.resolve(__dirname, '../../fixtures', projectName);
const guiUrl = `http://host.docker.internal:${PORTS[projectName].gui}`;

const reportDir = path.join(projectDir, 'report');
const reportBackupDir = path.join(projectDir, 'report-backup');

const runGui = async () => {
    return new Promise((resolve, reject) => {
        const child = childProcess.spawn('npm', ['run', 'gui'], {cwd: projectDir});

        let timeoutId = setTimeout(() => {
            treeKill(child.pid).then(() => {
                reject(new Error('Couldn\'t start GUI: timed out'));
            });
        }, 3000);

        child.stdout.on('data', (data) => {
            if (data.toString().includes('GUI is running at')) {
                clearTimeout(timeoutId);
                resolve(child);
            }
        });

        child.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`GUI process exited with code ${code}`));
            }
        });
    });
};

// These tests should not be launched in parallel
describe('GUI mode', () => {
    let guiProcess;

    beforeEach(async ({browser}) => {
        await fs.cp(reportDir, reportBackupDir, {recursive: true});

        guiProcess = await runGui();

        await browser.url(guiUrl);
        await browser.$('button*=Expand all').click();
    });

    afterEach(async ({browser}) => {
        await browser.execute(() => {
            window.localStorage.clear();
        });

        await treeKill(guiProcess.pid);

        await fs.rm(reportDir, {recursive: true, force: true, maxRetries: 3});
        await fs.rename(reportBackupDir, reportDir);

        childProcess.execSync('git restore .', {cwd: path.join(projectDir, 'screens')});
        childProcess.execSync('git clean -dfx .', {cwd: path.join(projectDir, 'screens')});
    });

    describe('running tests', () => {
        it('should run a single test', async ({browser}) => {
            const retryButton = await browser.$([
                getTestSectionByName('successful test'),
                '//button[contains(text(), "Retry")]'
            ].join(''));

            await retryButton.click();
            await retryButton.waitForClickable({timeout: 10000});

            // Should be passed
            const testSection = await browser.$(getTestSectionByName('successful test'));
            const testSectionClassNames = (await testSection.getAttribute('class')).split(' ');

            expect(testSectionClassNames).toContain('section_status_success');

            // History should appear
            const historySelector = [getTestSectionByName('successful test'), '//details[.//summary[contains(text(), "History")]]'].join('');

            await browser.$(historySelector).click();
            const historyText = await browser.$(historySelector + '/div').getText();

            expect(historyText.includes('<-')).toBeTruthy();
        });
    });

    for (const testName of ['diff', 'no ref']) {
        const fullTestName = `test with ${testName}`;
        describe(`accepting ${fullTestName}`, () => {
            beforeEach(async ({browser}) => {
                await browser.$(getTestSectionByName(fullTestName)).scrollIntoView();

                const acceptButton = await browser.$([
                    getTestSectionByName(fullTestName),
                    '//button[contains(text(), "Accept")]'
                ].join(''));

                await acceptButton.click();

                // Waiting a bit for the GUI to save images
                await new Promise(resolve => setTimeout(resolve, 500));
            });

            it('should create a successful retry', async ({browser}) => {
                const allRetryButtonsSelector = [
                    getTestSectionByName(fullTestName),
                    '//button[@data-test-id="retry-switcher"]'
                ].join('');
                const retrySwitcher = browser.$(`(${allRetryButtonsSelector})[last()]`);

                await retrySwitcher.assertView('retry-switcher');

                const testSection = await browser.$(getTestSectionByName(fullTestName));
                const testSectionClassNames = (await testSection.getAttribute('class')).split(' ');

                expect(testSectionClassNames).toContain('section_status_success');
            });

            it('should make the test pass on next run', async ({browser}) => {
                const retryButton = await browser.$([
                    getTestSectionByName(fullTestName),
                    '//button[contains(text(), "Retry")]'
                ].join(''));

                await retryButton.click();
                await retryButton.waitForClickable({timeout: 10000});

                // Verify green retry button
                const allRetryButtonsSelector = [
                    getTestSectionByName(fullTestName),
                    '//button[@data-test-id="retry-switcher"]'
                ].join('');
                const retrySwitcher = browser.$(`(${allRetryButtonsSelector})[last()]`);

                await retrySwitcher.assertView('retry-switcher');

                // Verify green test section
                const testSection = await browser.$(getTestSectionByName(fullTestName));
                const testSectionClassNames = (await testSection.getAttribute('class')).split(' ');

                expect(testSectionClassNames).toContain('section_status_success');
            });
        });
    }

    for (const testName of ['diff', 'no ref']) {
        const fullTestName = `test with ${testName}`;
        describe(`undo accepting ${fullTestName}`, () => {
            beforeEach(async ({browser}) => {
                await browser.$(getTestSectionByName(fullTestName)).scrollIntoView();

                const acceptButton = await browser.$([
                    getTestSectionByName(fullTestName),
                    '//button[contains(text(), "Accept")]'
                ].join(''));

                await acceptButton.click();

                // Waiting a bit for the GUI to save images
                await new Promise(resolve => setTimeout(resolve, 500));
            });

            it('should leave project files intact', async ({browser}) => {
                const gitDiffBeforeUndo = childProcess.execSync('git status . --porcelain=v2', {cwd: path.join(projectDir, 'screens')});

                const undoButton = await browser.$([
                    getTestSectionByName(fullTestName),
                    '//button[contains(text(), "Undo")]'
                ].join(''));

                await undoButton.click();

                // Waiting a bit for the GUI to save images
                await new Promise(resolve => setTimeout(resolve, 500));

                const gitDiffAfterUndo = childProcess.execSync('git status . --porcelain=v2', {cwd: path.join(projectDir, 'screens')});

                expect(gitDiffBeforeUndo.length > 0).toBeTruthy();
                expect(gitDiffAfterUndo.length === 0).toBeTruthy();
            });
        });
    }
});
