const childProcess = require('child_process');
const {existsSync} = require('fs');
const fs = require('fs/promises');
const path = require('path');
const {promisify} = require('util');

const treeKill = promisify(require('tree-kill'));

const {PORTS} = require('../../utils/constants');
const {runGui, waitForFsChanges} = require('../utils');

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';

const projectName = process.env.PROJECT_UNDER_TEST;
const projectDir = path.resolve(__dirname, '../../fixtures', projectName);
const guiUrl = `http://${serverHost}:${PORTS[projectName].gui}`;

const reportDir = path.join(projectDir, 'report');
const reportBackupDir = path.join(projectDir, 'report-backup');
const screensDir = path.join(projectDir, 'screens');

describe('GUI mode', () => {
    describe('Hotkeys', () => {
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

        describe('Run test hotkeys', () => {
            it('should run current test with "r" key', async ({browser}) => {
                const testElement = await browser.$('[data-qa="tree-view-item"]*=chrome');
                await testElement.click();

                await browser.keys('r');

                await browser.waitUntil(async () => {
                    const isLoading = await browser.$('.g-spin').isExisting();
                    return isLoading;
                }, {timeout: 5000, timeoutMsg: 'Test did not start running'});

                await expect(browser.$('[data-qa="suite-status-bar-status"]')).toHaveText('Success');
            });

            it('should run all visible tests with "shift+r" key', async ({browser}) => {
                await browser.keys(['Shift', 'r']);

                await browser.waitUntil(async () => {
                    const spinners = await browser.$$('.g-spin');
                    return spinners.length > 0;
                }, {timeout: 5000, timeoutMsg: 'Tests did not start running'});

                await browser.waitUntil(async () => {
                    const spinners = await browser.$$('.g-spin');
                    return spinners.length === 0;
                }, {timeout: 30000, timeoutMsg: 'Tests did not complete'});

                const treeItems = await browser.$$('[data-qa="tree-view-item"]*=chrome');

                await treeItems[0].click();
                await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();
                let attempts = await browser.$$('[data-qa="retry-switcher"]');
                expect(attempts.length).toBe(1);

                await treeItems[1].click();
                await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();
                attempts = await browser.$$('[data-qa="retry-switcher"]');
                expect(attempts.length).toBe(2);

                await treeItems[2].click();
                await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();
                attempts = await browser.$$('[data-qa="retry-switcher"]');
                expect(attempts.length).toBe(2);
            });
        });

        describe('Screenshot accept/undo hotkeys', () => {
            beforeEach(async ({browser}) => {
                await browser.keys('v');

                const visualChecksTitle = await browser.$('[data-qa="sidebar-title"]');
                await expect(visualChecksTitle).toHaveText('Visual Checks');
            });

            it('should accept screenshot with "a" key and auto-advance to next', async ({browser}) => {
                const failedTab = await browser.$('[title="Failed"]');
                await failedTab.click();

                await browser.waitUntil(async () => {
                    const items = await browser.$$('[data-qa="tree-view-item"]');
                    return items.length > 0;
                });

                const initialTitle = await browser.$('h2');
                const initialText = await initialTitle.getText();

                const acceptButton = await browser.$('[data-qa="accept-button"]');
                const isAcceptAvailable = await acceptButton.isExisting();

                if (isAcceptAvailable) {
                    await browser.keys('a');

                    await waitForFsChanges(screensDir);

                    await browser.waitUntil(async () => {
                        const title = await browser.$('h2');
                        const text = await title.getText();
                        return text !== initialText;
                    }, {timeout: 5000, timeoutMsg: 'Did not auto-advance to next screenshot'});
                }
            });

            it('should undo accept with "u" key', async ({browser}) => {
                const failedTab = await browser.$('[title="Failed"]');
                await failedTab.click();

                await browser.waitUntil(async () => {
                    const items = await browser.$$('[data-qa="tree-view-item"]');
                    return items.length > 0;
                });

                const acceptButton = await browser.$('[data-qa="accept-button"]');
                const isAcceptAvailable = await acceptButton.isExisting();

                if (isAcceptAvailable) {
                    await acceptButton.click();
                    await waitForFsChanges(screensDir);

                    await browser.keys('ArrowUp');

                    const undoButton = await browser.$('[data-qa="undo-button"]');
                    await browser.waitUntil(async () => await undoButton.isExisting());

                    await browser.keys('u');

                    await waitForFsChanges(screensDir, (output) => output.length === 0);

                    const acceptButtonAfterUndo = await browser.$('[data-qa="accept-button"]');
                    await expect(acceptButtonAfterUndo).toBeDisplayed();
                }
            });

            it('should accept all visible with "shift+a" key', async ({browser}) => {
                const failedTab = await browser.$('[title="Failed"]');
                await failedTab.click();

                await browser.waitUntil(async () => {
                    const items = await browser.$$('[data-qa="tree-view-item"]');
                    return items.length > 0;
                });

                const failedItems = await browser.$$('[data-qa="tree-view-item"]');
                const failedCount = failedItems.length;

                if (failedCount > 0) {
                    await browser.keys(['Shift', 'a']);

                    await waitForFsChanges(screensDir);

                    const passedTab = await browser.$('[title="Passed"]');
                    await passedTab.click();

                    await browser.waitUntil(async () => {
                        const items = await browser.$$('[data-qa="tree-view-item"]');
                        return items.length > 0;
                    });

                    const passedItems = await browser.$$('[data-qa="tree-view-item"]');
                    expect(passedItems.length).toBeGreaterThan(0);
                }
            });
        });

        describe('Navigation hotkeys in Suites page', () => {
            it('should navigate to Visual Checks with "g" key from screenshot', async ({browser}) => {
                const testWithImage = await browser.$('[data-list-item*="image comparison diff"]');
                if (await testWithImage.isExisting()) {
                    await testWithImage.click();

                    const screenshotContainer = await browser.$('[data-qa="go-visual-button"]');
                    if (await screenshotContainer.isExisting()) {
                        await screenshotContainer.scrollIntoView();
                        await screenshotContainer.moveTo();

                        await browser.keys('g');

                        const visualChecksTitle = await browser.$('[data-qa="sidebar-title"]');
                        await expect(visualChecksTitle).toHaveText('Visual Checks');
                    }
                }
            });
        });
    });
});
