if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Diff mode', () => {
                const navigateToFailedTest = async (browser) => {
                    const testElement = await browser.$('[data-list-item="failed describe/test with image comparison diff/chrome"]');
                    await testElement.click();
                };

                const navigateToVisualChecks = async (browser) => {
                    const menuItem = await browser.$('[data-qa="visual-checks-page-menu-item"]');
                    await menuItem.click();
                };

                const selectDiffModeOption = async (browser, selectQa, optionText) => {
                    const select = await browser.$(`[data-qa="${selectQa}"]`);
                    await select.waitForDisplayed();
                    await select.click();

                    const option = await browser.$(`//*[@role="option"][normalize-space()="${optionText}"]`);
                    await option.click();
                };

                const getSelectText = async (browser, selectQa) => {
                    const select = await browser.$(`[data-qa="${selectQa}"]`);
                    await select.waitForDisplayed();
                    return select.getText();
                };

                describe('Suites page', () => {
                    it('should use config value as default diff mode', async ({browser}) => {
                        await navigateToFailedTest(browser);

                        const selectText = await getSelectText(browser, 'suites-diff-mode-select');
                        expect(selectText).toContain('SbS (fit screen)');
                    });

                    it('should preserve diff mode after page refresh', async ({browser}) => {
                        await navigateToFailedTest(browser);

                        await selectDiffModeOption(browser, 'suites-diff-mode-select', 'Switch');

                        const selectTextBefore = await getSelectText(browser, 'suites-diff-mode-select');
                        expect(selectTextBefore).toContain('Switch');

                        await browser.refresh();
                        await navigateToFailedTest(browser);

                        const selectTextAfter = await getSelectText(browser, 'suites-diff-mode-select');
                        expect(selectTextAfter).toContain('Switch');
                    });
                });

                describe('Visual checks page', () => {
                    it('should default to 2-up interactive', async ({browser}) => {
                        await navigateToVisualChecks(browser);

                        const selectText = await getSelectText(browser, 'visual-checks-diff-mode-select');
                        expect(selectText).toContain('2-up Interactive');
                    });

                    it('should preserve diff mode after page refresh', async ({browser}) => {
                        await navigateToVisualChecks(browser);

                        await selectDiffModeOption(browser, 'visual-checks-diff-mode-select', 'Swipe');

                        const selectTextBefore = await getSelectText(browser, 'visual-checks-diff-mode-select');
                        expect(selectTextBefore).toContain('Swipe');

                        await browser.refresh();

                        const selectTextAfter = await getSelectText(browser, 'visual-checks-diff-mode-select');
                        expect(selectTextAfter).toContain('Swipe');
                    });

                    it('should have diff mode independent from suites page', async ({browser}) => {
                        await navigateToFailedTest(browser);
                        await selectDiffModeOption(browser, 'suites-diff-mode-select', 'Switch');

                        await navigateToVisualChecks(browser);

                        const selectText = await getSelectText(browser, 'visual-checks-diff-mode-select');
                        expect(selectText).toContain('2-up Interactive');
                    });
                });
            });
        });
    });
}
