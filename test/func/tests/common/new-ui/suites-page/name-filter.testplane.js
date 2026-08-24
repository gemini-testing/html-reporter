if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Name filter', () => {
                    let searchInput;
                    let matchCaseButton;
                    let regexButton;

                    beforeEach(async ({browser}) => {
                        searchInput = await browser.$('[data-qa="name-filter"] input');
                        matchCaseButton = await browser.$('[data-qa="match-case"]');
                        regexButton = await browser.$('[data-qa="regex"]');

                        await searchInput.waitForClickable();
                    });

                    it('tag', async ({browser}) => {
                        await searchInput.setValue('@ok-test');
                        await browser.$('[data-list-item="failed describe/successfully passed test"]').waitForDisplayed();
                    });

                    it('click to tag', async ({browser}) => {
                        const testElement = await browser.$('[data-list-item="failed describe/test with image comparison diff/chrome"]');
                        await testElement.click();

                        const tagElement = await browser.$('[data-qa="test-tag-error-test"]');
                        await tagElement.click();
                    });

                    it('usual search', async ({browser}) => {
                        await searchInput.setValue('failed describe test without screenshot');
                        await browser.$('[data-list-item="failed describe/test without screenshot"]').waitForDisplayed();
                    });

                    it('empty text', async ({browser}) => {
                        await searchInput.setValue('');
                        const allCcountElement = await browser.$('[data-qa="all-count"]');
                        await expect(allCcountElement).toHaveText('9');
                    });

                    it('empty result', async ({browser}) => {
                        await searchInput.setValue('not found');
                        await browser.$('[data-qa="empty-results"]').waitForDisplayed();
                        await browser.$('[data-qa="all-count"]').waitForDisplayed();
                    });

                    it('match case', async ({browser}) => {
                        await matchCaseButton.click();
                        await searchInput.setValue('FAILED');
                        await browser.$('[data-qa="empty-results"]').waitForDisplayed();
                    });

                    it('regex', async ({browser}) => {
                        await searchInput.setValue('failed *');
                        await regexButton.click();
                        await browser.$('[data-list-item="failed describe"]').waitForDisplayed();
                        await browser.$('[data-list-item="failed describe/test without screenshot"]').waitForDisplayed();
                        await browser.$('[data-list-item="failed describe/test with long error message"]').waitForDisplayed();
                    });
                });
            });
        });
    });
}
