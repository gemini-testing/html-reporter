const childProcess = require('child_process');
const {existsSync} = require('fs');
const fs = require('fs/promises');
const path = require('path');
const {promisify} = require('util');

const treeKill = promisify(require('tree-kill'));

const {PORTS} = require('../../utils/constants');
const {runGui} = require('../utils');

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';

const projectName = process.env.PROJECT_UNDER_TEST;
const projectDir = path.resolve(__dirname, '../../fixtures', projectName);
const guiUrl = `http://${serverHost}:${PORTS[projectName].gui}`;

const reportDir = path.join(projectDir, 'report');
const reportBackupDir = path.join(projectDir, 'report-backup');
const screensDir = path.join(projectDir, 'screens');

describe('GUI mode', () => {
    describe('Run test options', () => {
        let guiProcess;

        beforeEach(async ({browser}) => {
            if (existsSync(reportBackupDir)) {
                await fs.rm(reportDir, {recursive: true, force: true, maxRetries: 3});
                await fs.cp(reportBackupDir, reportDir, {recursive: true, force: true});
            } else {
                await fs.cp(reportDir, reportBackupDir, {recursive: true});
            }

            guiProcess = await runGui(projectDir);

            await browser.url(guiUrl + '/new-ui');

            await browser.waitUntil(async () => {
                const title = await browser.getTitle();
                return title.includes('GUI report');
            }, {timeout: 10000});
        });

        afterEach(async () => {
            await treeKill(guiProcess.pid);

            childProcess.execSync('git restore .', {cwd: screensDir});
            childProcess.execSync('git clean -dfx .', {cwd: screensDir});
        });

        describe('Repeat tests', () => {
            it('should run test n times', async ({browser}) => {
                const REPEAT_COUNT = 3;

                const testElement = await browser.$('[data-list-item="tests to run/test with image comparison diff/chrome"]');
                await testElement.click();

                const runTestOptionsButton = await browser.$('[data-qa="run-test-options"]');
                await runTestOptionsButton.waitForClickable();

                await runTestOptionsButton.click();

                const repeatCountInput = await browser.$('[data-qa="repeat-count"] input');
                await repeatCountInput.waitForDisplayed();
                await repeatCountInput.setValue(REPEAT_COUNT);

                const treeRunTestOptionsButton = await browser.$('[data-qa="tree-run-test-options"]');
                const treeRunTestOptionsButtonSelected = await treeRunTestOptionsButton.getAttribute('aria-pressed');

                expect(treeRunTestOptionsButtonSelected).toBe('true');

                const runTestButton = await browser.$('[data-qa="run-test"]');
                await runTestButton.waitForClickable();
                await runTestButton.click();

                await browser.waitUntil(async () => {
                    const attemptsList = await browser.$$('[data-qa="retry-switcher"]');

                    return attemptsList.length === (REPEAT_COUNT + 1);
                }, {timeout: 10000});

                const attemptsList = await browser.$$('[data-qa="retry-switcher"]');

                expect(attemptsList.length).toBe(4);
            });
        });
    });
});
