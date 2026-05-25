if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Sync filters', () => {
                    let searchInput;
                    let matchCaseButton;
                    let regexButton;
                    let visualChecksMenu;

                    beforeEach(async ({browser}) => {
                        searchInput = await browser.$('[data-qa="name-filter"] input');
                        matchCaseButton = await browser.$('[data-qa="match-case"]');
                        regexButton = await browser.$('[data-qa="regex"]');
                        visualChecksMenu = await browser.$('[data-qa="visual-checks-page-menu-item"]');

                        await searchInput.waitForClickable();
                    });

                    it('check same text on visual checks page', async ({browser}) => {
                        const value = 'some text';
                        await searchInput.setValue(value);
                        await visualChecksMenu.click();
                        await browser.pause(1000);

                        const newValue = await searchInput.getValue();

                        expect(newValue).toEqual(value);
                    });

                    it('check same status on visual checks page', async ({browser}) => {
                        const failedStatus = await browser.$('[title="Failed"]');
                        await failedStatus.click();

                        await visualChecksMenu.click();

                        const checked = await failedStatus.$('input[aria-checked="true"]');
                        expect(checked).toExist();
                    });

                    it('check fallback Skipped status to ALL on visual checks page', async ({browser}) => {
                        const skippedStatus = await browser.$('[title="Skipped"]');
                        await skippedStatus.click();

                        await visualChecksMenu.click();

                        const allStatus = await browser.$('[title="All"]');
                        const checked = await allStatus.$('input[aria-checked="true"]');
                        expect(checked).toExist();
                    });

                    it('check fallback Retried status to ALL on visual checks page', async ({browser}) => {
                        const retriedStatus = await browser.$('[title="Retried"]');
                        await retriedStatus.click();

                        await visualChecksMenu.click();

                        const allStatus = await browser.$('[title="All"]');
                        const checked = await allStatus.$('input[aria-checked="true"]');
                        expect(checked).toExist();
                    });

                    it('check same matchCase on visual checks page', async ({browser}) => {
                        await matchCaseButton.click();

                        await visualChecksMenu.click();

                        const matchCaseChecked = await browser.$('[data-qa="match-case"][aria-pressed="true"]');
                        expect(matchCaseChecked).toExist();
                    });

                    it('check same regex on visual checks page', async ({browser}) => {
                        await regexButton.click();

                        await visualChecksMenu.click();

                        const regexButtonChecked = await browser.$('[data-qa="regex"][aria-pressed="true"]');
                        expect(regexButtonChecked).toExist();
                    });
                });
            });
        });
    });
}
