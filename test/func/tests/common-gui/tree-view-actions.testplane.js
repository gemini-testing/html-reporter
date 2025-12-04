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
    describe('Tree view actions', () => {
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

        it('should run suite tests on run button click', async ({browser}) => {
            const suiteItem = await browser.$('[data-list-item="tests to run"]');
            await suiteItem.moveTo();

            const runButton = await suiteItem.$('button[title="Run tests"]');
            await runButton.waitForClickable();
            await runButton.click();

            await browser.waitUntil(async () => {
                const spinners = await browser.$$('.g-spin');
                return spinners.length > 0;
            }, {timeout: 5000, timeoutMsg: 'Tests did not start running'});

            await browser.waitUntil(async () => {
                const spinners = await browser.$$('.g-spin');
                return spinners.length === 0;
            }, {timeout: 30000, timeoutMsg: 'Tests did not complete'});

            const firstTest = await browser.$('[data-list-item*="test with image comparison diff"][data-list-item*="chrome"]');
            await firstTest.click();
            await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();
            let attempts = await browser.$$('[data-qa="retry-switcher"]');
            expect(attempts.length).toBe(2);

            const secondTest = await browser.$('[data-list-item*="test with no reference image"][data-list-item*="chrome"]');
            await secondTest.click();
            await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();
            attempts = await browser.$$('[data-qa="retry-switcher"]');
            expect(attempts.length).toBe(2);
        });
    });
});

