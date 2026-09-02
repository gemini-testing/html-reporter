if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Theme', () => {
                afterEach(async ({browser}) => {
                    // Reset theme to system default
                    const settingsMenuItem = await browser.$('[data-qa="footer-item-settings"]');
                    const panel = await browser.$('[data-qa="aside-panel-title"]');
                    const isPanelOpen = await panel.isDisplayed().catch(() => false);

                    if (!isPanelOpen) {
                        await settingsMenuItem.click();
                        await browser.$('[data-qa="aside-panel-title"]').waitForDisplayed();
                    }

                    const systemOption = await browser.$('[data-qa="theme-selector"] [value="system"]');
                    await systemOption.click();

                    await settingsMenuItem.click();
                    await panel.waitForDisplayed({reverse: true});
                });

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

                    await browser.assertView('dark-theme', 'body');
                });

                it('should switch to light theme', async ({browser}) => {
                    const settingsMenuItem = await openSettings(browser);

                    const lightOption = await browser.$('[data-qa="theme-selector"] [value="light"]');
                    await lightOption.click();

                    await closeSettings(browser, settingsMenuItem);

                    await browser.assertView('light-theme', 'body');
                });
            });
        });
    });
}
