if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Settings', () => {
                it('hide screenshots', async ({browser}) => {
                    const screenshotsElement = await browser.$('[data-qa="suites-tree-card"] img[alt="Screenshot"]');

                    // Be default screenshots exists
                    await expect(screenshotsElement).toExist();

                    const settingsMenuItem = await browser.$('[data-qa="footer-item-settings"]');

                    // Change screenshots switch in settings
                    await settingsMenuItem.click();

                    const hideScreenshotsSwitch = await browser.$('[data-qa="hide-screenshots"]');
                    await hideScreenshotsSwitch.click();

                    await settingsMenuItem.click();

                    // Check that now screenshots hidden
                    await expect(screenshotsElement).not.toExist();

                    const visualChecksMenuItem = await browser.$('[data-qa="visual-checks-page-menu-item"]');
                    await visualChecksMenuItem.click();

                    // Check that on visual checks page screenshots still displayed
                    await expect(screenshotsElement).toExist();
                });
            });
        });
    });
}
