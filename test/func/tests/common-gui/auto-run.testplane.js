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
    describe('Auto-run with -a option', () => {
        let guiProcess;

        afterEach(async () => {
            if (guiProcess) {
                await treeKill(guiProcess.pid);
            }

            childProcess.execSync('git restore .', {cwd: screensDir});
            childProcess.execSync('git clean -dfx .', {cwd: screensDir});
        });

        describe('New UI', () => {
            beforeEach(async ({browser}) => {
                if (existsSync(reportBackupDir)) {
                    await fs.rm(reportDir, {recursive: true, force: true, maxRetries: 3});
                    await fs.cp(reportBackupDir, reportDir, {recursive: true, force: true});
                } else {
                    await fs.cp(reportDir, reportBackupDir, {recursive: true});
                }

                guiProcess = await runGui(projectDir, {autoRun: true, grep: 'successful test'});

                await browser.url(guiUrl + '/new-ui');
            });

            it('should automatically run tests when started with -a option', async ({browser}) => {
                const testItem = await browser.$('[data-list-item*="chrome"]');
                await testItem.click();

                await browser.$('[data-qa="suite-status-bar-status"]*=Success').waitForDisplayed({timeout: 5000});
            });
        });
    });
});
