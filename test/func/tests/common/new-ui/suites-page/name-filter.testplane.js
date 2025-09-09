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

                    it('usual search', async ({browser}) => {
                        await searchInput.setValue('failed');
                        await browser.pause(1000);
                        await browser.assertView('body');
                    });

                    it('empty result', async ({browser}) => {
                        await searchInput.setValue('not found');
                        await browser.pause(1000);
                        await browser.assertView('body');
                    });

                    it('match case', async ({browser}) => {
                        await matchCaseButton.click();
                        await searchInput.setValue('FAILED');
                        await browser.pause(1000);
                        await browser.assertView('body');
                    });

                    it('regex', async ({browser}) => {
                        await searchInput.setValue('failed *');
                        await regexButton.click();
                        await browser.pause(1000);
                        await browser.assertView('body');
                    });
                });
            });
        });
    });
}
