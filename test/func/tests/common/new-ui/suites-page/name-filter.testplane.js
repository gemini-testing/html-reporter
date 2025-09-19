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
                    });

                    it('usual search', async () => {
                        await searchInput.setValue('failed');
                    });

                    it('empty text', async () => {
                        await searchInput.setValue('');
                    });

                    it('empty result', async () => {
                        await searchInput.setValue('not found');
                    });

                    it('match case', async () => {
                        await matchCaseButton.click();
                        await searchInput.setValue('FAILED');
                    });

                    it('regex', async () => {
                        await searchInput.setValue('failed *');
                        await regexButton.click();
                    });

                    afterEach(async ({browser}) => {
                        await browser.pause(1000);
                        await browser.assertView(
                            'sidebar',
                            '[data-qa="suites-tree-card"]',
                            {ignoreElements: ['img', 'div[data-qa="error-stack-item"]']}
                        );
                    });
                });
            });
        });
    });
}
