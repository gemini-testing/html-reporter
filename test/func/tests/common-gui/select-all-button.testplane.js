const path = require('path');
const {promisify} = require('util');

const treeKill = promisify(require('tree-kill'));

const {PORTS} = require('../../utils/constants');
const {runGui} = require('../utils');

const serverHost = process.env.SERVER_HOST ?? 'host.docker.internal';

const projectName = process.env.PROJECT_UNDER_TEST;
const projectDir = path.resolve(__dirname, '../../fixtures', projectName);
const guiUrl = `http://${serverHost}:${PORTS[projectName].gui}`;

describe('GUI mode', () => {
    describe('Select all button', () => {
        let guiProcess;

        beforeEach(async ({browser}) => {
            guiProcess = await runGui(projectDir);

            await browser.url(guiUrl + '/new-ui');

            await browser.waitUntil(async () => {
                const title = await browser.getTitle();
                return title.includes('GUI report');
            }, {timeout: 10000});
        });

        afterEach(async () => {
            await treeKill(guiProcess.pid);
        });

        it('should show button in default state when nothing selected', async ({browser}) => {
            const selectAllButton = await browser.$('[data-qa="select-all-button"]');
            await expect(selectAllButton).toBeExisting();

            await selectAllButton.assertView('button-default-state');
        });

        it('should show indeterminate state when one test selected', async ({browser}) => {
            const firstCheckbox = await browser.$('.g-checkbox__control');
            await firstCheckbox.click();

            await browser.pause(500);

            const selectAllButton = await browser.$('[data-qa="select-all-button"]');
            await selectAllButton.assertView('button-indeterminate-state');
        });

        it('should show all selected state when select all clicked', async ({browser}) => {
            const selectAllButton = await browser.$('[data-qa="select-all-button"]');
            await selectAllButton.click();

            await browser.pause(500);

            await selectAllButton.assertView('button-all-selected-state');
        });

        it('should show correct count when failed filter applied', async ({browser}) => {
            const failedTab = await browser.$('[title="Failed"]');
            await failedTab.click();

            await browser.pause(1000);

            const selectAllButton = await browser.$('[data-qa="select-all-button"]');
            await selectAllButton.click();

            const selectedCount = await browser.$('[data-qa="selected-tests-count"]');
            await expect(selectedCount).toBeDisplayed();

            const selectedText = await selectedCount.getText();

            const failedTabText = await failedTab.getText();
            const failedCountMatch = failedTabText.match(/\d+/);
            const failedCount = failedCountMatch ? failedCountMatch[0] : '-1';

            expect(selectedText).toContain(failedCount);
        });
    });
});
