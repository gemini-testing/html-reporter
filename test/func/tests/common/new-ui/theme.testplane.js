if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Theme', () => {
                async function openSettings(browser) {
                    const settingsMenuItem = await browser.$('[data-qa="footer-item-settings"]');
                    await settingsMenuItem.click();
                    await browser.$('[data-qa="aside-panel-title"]').waitForDisplayed();
                    return settingsMenuItem;
                }

                async function closeSettings(browser, settingsMenuItem) {
                    await settingsMenuItem.click();
                    await browser.$('[data-qa="aside-panel-title"]').waitForDisplayed({reverse: true});
                }

                it('should switch to dark theme', async ({browser}) => {
                    const settingsMenuItem = await openSettings(browser);

                    const darkOption = await browser.$('[data-qa="theme-selector"] [value="dark"]');
                    await darkOption.click();

                    await closeSettings(browser, settingsMenuItem);

                    await browser.assertView('dark-theme', 'body', {ignoreElements: ['[data-qa="tree-view-list"]']});
                });

                it('should switch to light theme', async ({browser}) => {
                    const settingsMenuItem = await openSettings(browser);

                    const lightOption = await browser.$('[data-qa="theme-selector"] [value="light"]');
                    await lightOption.click();

                    await closeSettings(browser, settingsMenuItem);

                    await browser.assertView('light-theme', 'body', {ignoreElements: ['[data-qa="tree-view-list"]']});
                });
            });
        });
    });
}
