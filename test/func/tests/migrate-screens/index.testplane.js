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
// const screensDir = path.join(projectDir, 'screens');

const runMigrateScreens = async (cwd) => {
    return new Promise((resolve, reject) => {
        let output = '';
        const child = childProcess.spawn('npx', ['testplane', 'migrate-screens'], {cwd});

        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.stderr.on('data', (data) => {
            output += data.toString();
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`migrate-screens exited with code ${code}: ${output}`));
            } else {
                resolve(output);
            }
        });

        child.on('error', (err) => {
            reject(err);
        });
    });
};

describe('migrate-screens CLI tool', function() {
    let guiProcess;

    beforeEach(async () => {
        if (existsSync(reportBackupDir)) {
            await fs.rm(reportDir, {recursive: true, force: true, maxRetries: 3});
            await fs.cp(reportBackupDir, reportDir, {recursive: true, force: true});
        } else {
            await fs.cp(reportDir, reportBackupDir, {recursive: true});
        }
    });

    afterEach(async () => {
        if (guiProcess) {
            await treeKill(guiProcess.pid);
        }

        childProcess.execSync('git restore .', {cwd: projectDir});
        childProcess.execSync('git clean -dfx .', {cwd: projectDir});
    });

    /* What this test does:
    - Opens GUI before migration and verifies report state
    - Runs migrate-screens CLI tool
    - Opens GUI after migration and verifies that correct tests were migrated and other tests were not migrated
     */
    it('should migrate screens and update references', async ({browser}) => {
        const testsToVerify = [
            'failed assertView 1 due to fractional pixel difference in testplane v9 and should be migrated',
            'failed assertView 2 due to fractional pixel difference in testplane v9 and should be migrated'
        ];

        guiProcess = await runGui(projectDir);

        await browser.url(guiUrl + '/new-ui');

        await browser.waitUntil(async () => {
            const title = await browser.getTitle();
            return title.includes('GUI report');
        }, {timeout: 10000});

        for (const testName of testsToVerify) {
            const chromeItem = await browser.$(`[data-list-item*="${testName}"][data-list-item*="chrome"]`);
            await chromeItem.click();

            await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();

            const attempts = await browser.$$('[data-qa="retry-switcher"]');
            expect(attempts.length).toBe(1);
        }

        await treeKill(guiProcess.pid);
        guiProcess = null;

        const output = await runMigrateScreens(projectDir);

        expect(output).toContain('Migration finished');
        expect(output).toContain('2 auto-accepted');

        guiProcess = await runGui(projectDir);

        await browser.url(guiUrl + '/new-ui');

        await browser.waitUntil(async () => {
            const title = await browser.getTitle();
            return title.includes('GUI report');
        }, {timeout: 10000});

        for (const testName of testsToVerify) {
            const chromeItem = await browser.$(`[data-list-item*="${testName}"][data-list-item*="chrome"]`);
            await chromeItem.click();

            await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();

            const attempts = await browser.$$('[data-qa="retry-switcher"]');
            expect(attempts.length).toBe(2);

            const statusElement = await browser.$('[data-qa="suite-status-bar-status"]');
            await expect(statusElement).toHaveText('Success');

            const assertViewStep = await browser.$('//li[contains(@class, "g-list-item-view") and .//span[text()="assertView"]]');
            await assertViewStep.click();

            const assertViewStatus = await browser.$('[data-qa="assert-view-status"]');
            await assertViewStatus.waitForDisplayed();
            await expect(assertViewStatus).toHaveText('Reference updated');
        }

        const notMigratedTest = await browser.$('[data-list-item*="failed assertView due to design changes and should not be migrated"][data-list-item*="chrome"]');
        await notMigratedTest.click();
        await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();

        const notMigratedAttempts = await browser.$$('[data-qa="retry-switcher"]');
        expect(notMigratedAttempts.length).toBe(1);

        const notMigratedStatus = await browser.$('[data-qa="suite-status-bar-status"]');
        await expect(notMigratedStatus).toHaveText('Fail');

        const successfulTest = await browser.$('[data-list-item*="successful assertView"][data-list-item*="chrome"]');
        await successfulTest.click();
        await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();

        const successfulAttempts = await browser.$$('[data-qa="retry-switcher"]');
        expect(successfulAttempts.length).toBe(1);

        const successfulStatus = await browser.$('[data-qa="suite-status-bar-status"]');
        await expect(successfulStatus).toHaveText('Success');
    });
});
