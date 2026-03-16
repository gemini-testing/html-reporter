if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Collapsible sections state', () => {
                    const navigateToFailedTest = async (browser) => {
                        const testElement = await browser.$('[data-list-item="failed describe/test with image comparison diff/chrome"]');
                        await testElement.click();
                    };

                    const getSectionTitleElement = async (browser, sectionTitle) => {
                        const title = await browser.$(`h3*=${sectionTitle}`);
                        await title.waitForDisplayed({timeout: 10000});

                        return title;
                    };

                    const getSectionState = async (browser, sectionTitle) => {
                        const title = await getSectionTitleElement(browser, sectionTitle);
                        return title.getAttribute('data-section-state');
                    };

                    const toggleSection = async (browser, sectionTitle) => {
                        const title = await getSectionTitleElement(browser, sectionTitle);
                        await title.click();
                    };

                    const waitForSectionStateChange = async (browser, sectionTitle, initialState) => {
                        await browser.waitUntil(async () => {
                            const currentState = await getSectionState(browser, sectionTitle);

                            return currentState !== initialState;
                        }, {
                            timeout: 3000,
                            timeoutMsg: `Section "${sectionTitle}" state did not change`
                        });
                    };

                    ['Actions', 'Metadata'].forEach((sectionTitle) => {
                        it(`should preserve ${sectionTitle} section state after page refresh`, async ({browser}) => {
                            await navigateToFailedTest(browser);

                            const initialState = await getSectionState(browser, sectionTitle);

                            await toggleSection(browser, sectionTitle);
                            await waitForSectionStateChange(browser, sectionTitle, initialState);

                            const stateAfterToggle = await getSectionState(browser, sectionTitle);
                            expect(stateAfterToggle).toBe('closed');

                            await browser.refresh();
                            await navigateToFailedTest(browser);

                            const stateAfterRefresh = await getSectionState(browser, sectionTitle);

                            expect(stateAfterRefresh).toBe(stateAfterToggle);
                        });
                    });
                });
            });
        });
    });
}
